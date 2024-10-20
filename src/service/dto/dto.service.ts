import { IsNotEmpty } from 'class-validator';

export type ServiceType = '0' | '1' | '2' | '3';

export class CreateServiceController {
  @IsNotEmpty({ message: 'Vui lòng nhập tên nhân vật' })
  playerName: string;

  @IsNotEmpty({ message: 'Vui lòng chọn hình thức giao dịch' })
  type: ServiceType;

  @IsNotEmpty({ message: 'Vui lòng nhập số thỏi vàng/vàng giao dịch' })
  amount: number;

  @IsNotEmpty({ message: 'Vui lòng chọn máy chủ giao dịch' })
  server: string;
}

export class CancelServiceController {
  @IsNotEmpty({ message: 'Vui lòng nhập mã giao dịch' })
  serviceId: string;
}

//TODO ———————————————[DTO Service]———————————————

export class CreateService {
  @IsNotEmpty({ message: 'Vui lòng nhập mã người dùng' })
  uid: string;

  @IsNotEmpty({ message: 'Vui lòng nhập tên nhân vật' })
  playerName: string;

  @IsNotEmpty({ message: 'Vui lòng chọn hình thức giao dịch' })
  type: ServiceType;

  @IsNotEmpty({ message: 'Vui lòng nhập số thỏi vàng/vàng giao dịch' })
  amount: number;

  @IsNotEmpty({ message: 'Vui lòng chọn máy chủ giao dịch' })
  server: string;
}

export class CancelService {
  @IsNotEmpty({ message: 'Vui lòng nhập mã người dùng' })
  uid: string;

  @IsNotEmpty({ message: 'Vui lòng nhập mã giao dịch' })
  serviceId: string;
}
