import Link from "next/link";

export function SiteFooter() {
  const benefits = [
    ["♧", "Chứng nhận VietGAP", "Hữu cơ 100% kiểm định an toàn"],
    ["⟳", "Đổi trả trong 24 giờ", "Bảo hành tươi mới hoàn tiền"],
    ["ϟ", "Giao siêu tốc 2 giờ", "Đóng thùng xốp giữ tươi lạnh"],
    ["♢", "Nguồn gốc rõ ràng", "Truy xuất nông trại minh bạch"]
  ];
  return (
    <footer className="mt-auto">
      <section className="grid grid-cols-2 gap-4 bg-[#edf5e9] px-6 py-6 md:grid-cols-4 md:px-[max(1.5rem,calc((100%_-_1200px)/2))]">
        {benefits.map(([icon, title, text]) => (
          <div
            className="grid grid-cols-[28px_1fr] text-[var(--green)]"
            key={title}
          >
            <span>{icon}</span>
            <b className="text-xs text-[var(--ink)]">{title}</b>
            <small className="col-start-2 text-[10px] text-[var(--muted)]">
              {text}
            </small>
          </div>
        ))}
      </section>
      <section className="grid gap-8 bg-[#f0f7ed] px-6 py-8 text-[11px] leading-7 text-[#68746b] md:grid-cols-4 md:px-[max(1.5rem,calc((100%_-_1200px)/2))]">
        <div>
          <Link href="/" className="text-lg font-bold text-[var(--green)]">
            ✦ AgriStore
          </Link>
          <p>
            Hệ thống phân phối nông sản tươi hữu cơ trực tiếp từ các hợp tác xã
            nông nghiệp sạch.
          </p>
          <small>
            ⌖ 128 Nguyễn Đình Chiểu, Quận 3, TP.HCM
            <br />☎ 1900 6868
            <br />✉ cskh@agristore.vn
          </small>
        </div>
        <div>
          <b>DANH MỤC NÔNG SẢN</b>
          <p>
            Rau củ hữu cơ Đà Lạt
            <br />
            Trái cây nhiệt đới
            <br />
            Nấm & rau mầm
            <br />
            Gạo ST25 & hạt ngũ cốc
          </p>
        </div>
        <div>
          <b>CHÍNH SÁCH KHÁCH HÀNG</b>
          <p>
            Chính sách kiểm hàng
            <br />
            Quy trình bảo quản
            <br />
            Đổi trả trong 24 giờ
            <br />
            Bảo mật thông tin
          </p>
        </div>
        <div>
          <b>THANH TOÁN & CHỨNG NHẬN</b>
          <p>
            <span className="bg-white px-1">COD</span>{" "}
            <span className="bg-white px-1">VNPay</span>
            <br />
            <span className="bg-white px-1">Chuyển khoản</span>
          </p>
          <strong className="block rounded bg-[var(--mint)] px-2 py-1 text-[var(--deep)]">
            ✓ Nông trại chuẩn VietGAP
          </strong>
        </div>
      </section>
    </footer>
  );
}
