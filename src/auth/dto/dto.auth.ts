import { IsNotEmpty, IsString, Length, MinLength } from 'class-validator';

export class Login {
  @IsNotEmpty({ message: 'Bạn chưa nhập tên đăng nhập' })
  username: string;

  @IsNotEmpty({ message: 'Bạn chưa nhập mật khẩu' })
  @MinLength(6, { message: 'Độ dài mật khẩu tối thiểu là 6 ký tự' })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  password: string;
}

export class Resigter {
  @IsNotEmpty({ message: 'Bạn chưa nhập tên đăng nhập' })
  username: string;

  @IsNotEmpty({ message: 'Bạn chưa nhập mật khẩu' })
  @MinLength(6, { message: 'Độ dài mật khẩu tối thiểu là 6 ký tự' })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  password: string;

  @IsNotEmpty({ message: 'Bạn chưa nhập tên hiển thị' })
  name: string;

  @IsNotEmpty({ message: 'Bạn chưa chọn máy chủ' })
  server: string;
}

export class ChangePWD {
  @IsNotEmpty({ message: 'Bạn chưa nhập UID' })
  uid: string;

  @IsNotEmpty({ message: 'Bạn chưa nhập mật khẩu cũ' })
  @MinLength(6, { message: 'Độ dài mật khẩu tối thiểu là 6 ký tự' })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  pwd_c: string;

  @IsNotEmpty({ message: 'Bạn chưa nhập mật khẩu mới' })
  @MinLength(6, { message: 'Độ dài mật khẩu tối thiểu là 6 ký tự' })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  pwd_n: string;
}
