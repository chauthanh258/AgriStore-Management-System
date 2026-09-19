Danh sách 24 bảng chính

Chi tiết các bảng quan trọng (cột chính)
1. Roles

    Id (PK)
    Name (Admin, Manager, Staff, Customer)
    Description
    CreatedAt

2. Users

    Id (PK, Guid hoặc int)
    UserName, Email, PasswordHash
    FullName, PhoneNumber
    Avatar, IsActive
    CreatedAt, UpdatedAt
    (Có thể liên kết với Employees hoặc Customers)

3. UserRoles

    UserId (FK)
    RoleId (FK)
    Primary Key composite

4. Categories

    Id, Name, Description
    ParentId (tự tham chiếu – danh mục con)
    Image, IsActive, SortOrder

5. Units

    Id, Name (Kg, Gram, Bó, Thùng, Gói, Lít…)
    Symbol, Description

6. Products

    Id, Code (SKU), Name
    CategoryId (FK), UnitId (FK)
    Description, ShortDescription
    CostPrice, SellingPrice
    MinStockAlert (cảnh báo tồn thấp)
    ExpiryDays (hạn sử dụng ước tính)
    IsActive, IsFeatured
    CreatedAt, UpdatedAt

7. ProductImages

    Id, ProductId (FK)
    ImageUrl, IsMain, SortOrder

8. Suppliers

    Id, Code, Name
    ContactPerson, Phone, Email, Address
    TaxCode, IsActive, Notes

9. Warehouses

    Id, Name, Address, Phone
    IsDefault, IsActive

10. Inventories

    Id, ProductId (FK), WarehouseId (FK)
    Quantity (số lượng hiện tại)
    ReservedQuantity (đang giữ cho đơn hàng)
    Unique (ProductId + WarehouseId)

11. StockTransactions

    Id, ProductId, WarehouseId
    TransactionType (Import, Export, Adjust, Transfer, Return)
    Quantity, ReferenceId (liên kết đơn nhập/đơn bán)
    Notes, CreatedBy, CreatedAt

12. PurchaseOrders

    Id, Code, SupplierId (FK)
    WarehouseId (FK)
    OrderDate, ExpectedDate, Status (Draft, Ordered, Received, Cancelled)
    TotalAmount, Notes, CreatedBy

13. PurchaseOrderDetails

    Id, PurchaseOrderId (FK), ProductId (FK)
    Quantity, UnitPrice, TotalPrice
    ReceivedQuantity

14. Customers

    Id, UserId (FK nullable – nếu khách có tài khoản)
    FullName, Phone, Email
    Gender, DateOfBirth, LoyaltyPoints
    Notes

15. Addresses

    Id, CustomerId (FK) hoặc UserId
    ReceiverName, Phone
    Province, District, Ward, DetailAddress
    IsDefault

16. Orders

    Id, Code, CustomerId (FK nullable)
    UserId (nhân viên tạo đơn – nếu bán tại quầy)
    OrderDate, Status (Pending, Confirmed, Shipping, Completed, Cancelled)
    ShippingAddressId (FK)
    ShippingMethodId (FK)
    SubTotal, DiscountAmount, ShippingFee, TotalAmount
    Note, CouponId (FK nullable)

17. OrderDetails

    Id, OrderId (FK), ProductId (FK)
    Quantity, UnitPrice, Discount, TotalPrice

18. Payments

    Id, OrderId (FK)
    PaymentMethod (Cash, BankTransfer, Momo, VNPay…)
    Amount, Status, TransactionCode
    PaidAt, Notes

19. ShippingMethods

    Id, Name, Description, Fee, EstimatedDays
    IsActive

20. Deliveries

    Id, OrderId (FK)
    TrackingCode, ShipperName, ShipperPhone
    Status, ShippedAt, DeliveredAt, Notes

21. Coupons

    Id, Code, Description
    DiscountType (Percent / Fixed), DiscountValue
    MinOrderAmount, MaxDiscount
    StartDate, EndDate, UsageLimit, UsedCount
    IsActive

22. ProductReviews

    Id, ProductId (FK), CustomerId (FK)
    Rating (1-5), Comment, IsApproved
    CreatedAt

23. Notifications

    Id, UserId (FK)
    Title, Content, Type
    IsRead, CreatedAt

24. AuditLogs

    Id, UserId, Action, TableName, RecordId
    OldValue, NewValue, IpAddress, CreatedAt


Quan hệ chính (tóm tắt)

    Users ↔ Roles (nhiều-nhiều qua UserRoles)
    Products → Categories, Units
    Products ↔ ProductImages (1-n)
    Inventories → Products + Warehouses
    StockTransactions → Products + Warehouses
    PurchaseOrders → Suppliers + Warehouses
    PurchaseOrderDetails → PurchaseOrders + Products
    Orders → Customers + Users + Addresses + ShippingMethods + Coupons
    OrderDetails → Orders + Products
    Payments → Orders
    Deliveries → Orders
    ProductReviews → Products + Customers