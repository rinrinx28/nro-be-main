import { IsNotEmpty } from 'class-validator';

export class CreateBot {
  @IsNotEmpty({ message: 'Xin vui lòng chọn Bot' })
  uid: string;

  @IsNotEmpty({ message: 'Xin vui lòng chọn chế độ kích hoạt/tắt' })
  isAvailable: boolean;

  @IsNotEmpty({ message: 'Xin vui lòng cài đặt nâng cao cho Bot' })
  meta: {
    active: string;
    TotalTrade: number;
    max_sv: number;
  };
}
