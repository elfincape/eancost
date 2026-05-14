export type VehicleType = "fixed" | "temporary";

export type FixedVehicle = {
  id: string;
  vehicleNumber: string;
  driverName: string;
  centerName: string;
  createdAt: string;
};

export type ClassifiedSettlementRow = {
  id: string;
  sheetName: string;
  rowIndex: number;
  vehicleNumber: string;
  driverName?: string;
  centerName?: string;
  vehicleType: VehicleType;
  matchedVehicle?: FixedVehicle;
  data: Record<string, unknown>;
};
