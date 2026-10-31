"use client";
import {
  KpiGrid,
  PageHeader,
  Panel,
  StatusBadge
} from "../../../components/admin/admin-ui";
import { inventory } from "../../../data/admin-mock";
export default function InventoryPage() {
  return (
    <>
      <PageHeader
        eyebrow="QUẢN LÝ CHUỖI CUNG ỨNG　›　KHO & KIỂM KÊ TỒN"
        title="Kiểm Kê & Quản Trị Tồn Kho Nông Sản"
        description="Hệ thống kho theo thời gian thực (FIFO) và cảnh báo hàng tươi."
        action={
          <button className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white">
            ＋ Tạo Phiếu Kiểm Kê (F4)
          </button>
        }
      />
      <KpiGrid
        items={[
          {
            label: "Tổng giá trị tồn kho",
            value: 348200000,
            hint: "+4.2% so với tháng trước"
          },
          {
            label: "Cảnh báo tồn thiếu",
            value: "07 mặt hàng",
            hint: "Tạo đơn đặt nhập",
            tone: "amber"
          },
          {
            label: "Cận date thanh lý (<48h)",
            value: "03 loại rau",
            hint: "Xử lý lô hàng",
            tone: "red"
          },
          {
            label: "Đang trung chuyển",
            value: "1.200 kg",
            hint: "Xe lạnh dự kiến 14:00",
            tone: "blue"
          }
        ]}
      />
      <div className="grid gap-5 xl:grid-cols-[1.6fr_.8fr]">
        <Panel title="▤ Danh Sách Tồn Kho Chi Tiết">
          <div className="mb-4 flex gap-2">
            <button className="rounded bg-[#006948] px-3 py-2 text-xs text-white">
              Kho lạnh Quận 3
            </button>
            <input
              className="flex-1 rounded border p-2 text-xs"
              placeholder="Tìm tên rau, SKU..."
            />
          </div>
          <div className="divide-y divide-[#e7eee4]">
            {inventory.map((item) => (
              <div
                className={`grid grid-cols-[1fr_auto_auto] gap-3 p-4 text-xs ${item.isLowStock ? "bg-[#fffdf5]" : ""}`}
                key={item.productId}
              >
                <span>
                  <b>{item.productName}</b>
                  <small className="block text-[10px] text-[#66736a]">
                    {item.productCode}
                  </small>
                </span>
                <span>
                  Tồn: <b>{item.quantity}</b>
                  <small className="block text-[#66736a]">
                    Khả dụng {item.availableQuantity}
                  </small>
                </span>
                <StatusBadge tone={item.isLowStock ? "amber" : "green"}>
                  {item.isLowStock ? "Cảnh báo" : "An toàn"}
                </StatusBadge>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Cần Xử Lý Bảo Quản Ngay">
          <p className="rounded bg-[#fee2e2] p-3 text-xs text-red-700">
            4 mặt hàng có nguy cơ sốc nhiệt/date ngắn
          </p>
          {inventory
            .filter((item) => item.isLowStock)
            .map((item) => (
              <div
                className="mt-3 rounded bg-[#f7faf5] p-3 text-xs"
                key={item.productId}
              >
                <b>{item.productName}</b>
                <small className="block text-[#b45309]">
                  Tồn khả dụng: {item.availableQuantity}
                </small>
              </div>
            ))}
        </Panel>
      </div>
    </>
  );
}
