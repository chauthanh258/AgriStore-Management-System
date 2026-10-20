using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using AgriStore.Api.DTOs.ProductReviews;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AgriStore.Api.Services;

public sealed class ProductReviewService(ApplicationDbContext dbContext) : IProductReviewService
{
    public async Task<ProductReviewListResponse?> GetByProductAsync(
        Guid productId,
        ProductReviewListQuery query,
        CancellationToken cancellationToken)
    {
        var productExists = await dbContext.Products
            .AsNoTracking()
            .AnyAsync(product => product.Id == productId, cancellationToken);
        if (!productExists)
        {
            return null;
        }

        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var reviewsQuery = dbContext.ProductReviews
            .AsNoTracking()
            .Where(review => review.ProductId == productId);

        if (!query.IncludePending)
        {
            reviewsQuery = reviewsQuery.Where(review => review.IsApproved);
        }

        var totalCount = await reviewsQuery.CountAsync(cancellationToken);
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
        var offset = ((long)query.Page - 1) * pageSize;
        if (offset > int.MaxValue)
        {
            return new ProductReviewListResponse(
                Array.Empty<ProductReviewResponse>(),
                query.Page,
                pageSize,
                totalCount,
                totalPages);
        }

        var rows = await (
                from review in reviewsQuery
                join customer in dbContext.Customers.AsNoTracking()
                    on review.CustomerId equals customer.Id
                orderby review.CreatedAt descending, review.Id
                select new
                {
                    review.Id,
                    review.ProductId,
                    CustomerName = customer.FullName,
                    review.Rating,
                    review.Comment,
                    review.IsApproved,
                    review.CreatedAt
                })
            .Skip((int)offset)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = rows.Select(row => new ProductReviewResponse(
            row.Id,
            row.ProductId,
            row.CustomerName,
            row.Rating,
            row.Comment,
            row.IsApproved,
            new DateTimeOffset(DateTime.SpecifyKind(row.CreatedAt, DateTimeKind.Utc)))).ToArray();

        return new ProductReviewListResponse(
            items,
            query.Page,
            pageSize,
            totalCount,
            totalPages);
    }

    public async Task<ProductReviewServiceResult<ProductReviewResponse>> CreateAsync(
        Guid productId,
        Guid userId,
        CreateProductReviewRequest request,
        CancellationToken cancellationToken)
    {
        var productExists = await dbContext.Products
            .AsNoTracking()
            .AnyAsync(product => product.Id == productId, cancellationToken);
        if (!productExists)
        {
            return ProductReviewServiceResult<ProductReviewResponse>.Failure(
                StatusCodes.Status404NotFound,
                "Không tìm thấy sản phẩm.");
        }

        var customer = await dbContext.Customers
            .SingleOrDefaultAsync(item => item.UserId == userId, cancellationToken);
        if (customer is null)
        {
            return ProductReviewServiceResult<ProductReviewResponse>.Failure(
                StatusCodes.Status409Conflict,
                "Tài khoản chưa có hồ sơ khách hàng.");
        }

        var hasCompletedOrder = await (
                from order in dbContext.Orders
                join detail in dbContext.OrderDetails on order.Id equals detail.OrderId
                where order.CustomerId == customer.Id
                    && order.Status == "Completed"
                    && detail.ProductId == productId
                select order.Id)
            .AnyAsync(cancellationToken);
        if (!hasCompletedOrder)
        {
            return ProductReviewServiceResult<ProductReviewResponse>.Failure(
                StatusCodes.Status409Conflict,
                "Chỉ khách hàng đã mua và nhận sản phẩm mới được đánh giá.");
        }

        var alreadyReviewed = await dbContext.ProductReviews
            .AnyAsync(
                review => review.ProductId == productId && review.CustomerId == customer.Id,
                cancellationToken);
        if (alreadyReviewed)
        {
            return ProductReviewServiceResult<ProductReviewResponse>.Failure(
                StatusCodes.Status409Conflict,
                "Bạn đã đánh giá sản phẩm này.");
        }

        var review = new ProductReview
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            CustomerId = customer.Id,
            Rating = request.Rating,
            Comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim(),
            IsApproved = false,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.ProductReviews.Add(review);
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (
            exception.InnerException is PostgresException
            {
                SqlState: PostgresErrorCodes.UniqueViolation
            })
        {
            return ProductReviewServiceResult<ProductReviewResponse>.Failure(
                StatusCodes.Status409Conflict,
                "Bạn đã đánh giá sản phẩm này.");
        }

        return ProductReviewServiceResult<ProductReviewResponse>.Success(new ProductReviewResponse(
            review.Id,
            review.ProductId,
            customer.FullName,
            review.Rating,
            review.Comment,
            review.IsApproved,
            new DateTimeOffset(review.CreatedAt, TimeSpan.Zero)));
    }

    public async Task<ProductReviewServiceResult<ProductReviewResponse>> SetApprovalAsync(
        Guid reviewId,
        bool isApproved,
        CancellationToken cancellationToken)
    {
        var review = await (
                from item in dbContext.ProductReviews
                join customer in dbContext.Customers on item.CustomerId equals customer.Id
                where item.Id == reviewId
                select new { Review = item, customer.FullName })
            .SingleOrDefaultAsync(cancellationToken);

        if (review is null)
        {
            return ProductReviewServiceResult<ProductReviewResponse>.Failure(
                StatusCodes.Status404NotFound,
                "Không tìm thấy đánh giá.");
        }

        review.Review.IsApproved = isApproved;
        await dbContext.SaveChangesAsync(cancellationToken);

        return ProductReviewServiceResult<ProductReviewResponse>.Success(new ProductReviewResponse(
            review.Review.Id,
            review.Review.ProductId,
            review.FullName,
            review.Review.Rating,
            review.Review.Comment,
            review.Review.IsApproved,
            new DateTimeOffset(DateTime.SpecifyKind(review.Review.CreatedAt, DateTimeKind.Utc))));
    }

    public async Task<ProductReviewServiceResult<bool>> DeleteAsync(
        Guid reviewId,
        Guid userId,
        bool isModerator,
        CancellationToken cancellationToken)
    {
        var review = await dbContext.ProductReviews
            .SingleOrDefaultAsync(item => item.Id == reviewId, cancellationToken);
        if (review is null)
        {
            return ProductReviewServiceResult<bool>.Failure(
                StatusCodes.Status404NotFound,
                "Không tìm thấy đánh giá.");
        }

        if (!isModerator)
        {
            var ownsReview = await dbContext.Customers
                .AnyAsync(
                    customer => customer.Id == review.CustomerId && customer.UserId == userId,
                    cancellationToken);
            if (!ownsReview)
            {
                return ProductReviewServiceResult<bool>.Failure(
                    StatusCodes.Status403Forbidden,
                    "Bạn không có quyền xóa đánh giá này.");
            }
        }

        dbContext.ProductReviews.Remove(review);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ProductReviewServiceResult<bool>.Success(true);
    }
}
