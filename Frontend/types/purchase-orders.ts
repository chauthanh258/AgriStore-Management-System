export interface PurchaseOrderLineRequest {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseOrderRequest {
  supplierId: string;
  warehouseId: string;
  orderDate: string;
  expectedDate?: string;
  notes?: string;
  details: PurchaseOrderLineRequest[];
}

export interface PurchaseOrderDetail {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity: number;
}

export interface PurchaseOrder {
  id: string;
  code: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  orderDate: string;
  expectedDate?: string | null;
  status: string;
  totalAmount: number;
  notes?: string | null;
  details: PurchaseOrderDetail[];
}

export interface ReceivePurchaseOrderRequest {
  details: Array<{ productId: string; receivedQuantity: number }>;
}
