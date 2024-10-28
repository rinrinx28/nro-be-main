import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { ChangePWD, Resigter } from './dto/dto.auth';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FingerPrint } from './schema/finger.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(FingerPrint.name)
    private readonly FingerPrintModel: Model<FingerPrint>,
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    username: string,
    pass: string,
    hash: string,
  ): Promise<any> {
    const user = await this.userService.findUserOption({ username });
    const target_finger = await this.FingerPrintModel.findOne({ hash });
    if (!user) {
      throw new UnauthorizedException('Vui lòng kiểm tra lại tên đăng nhập'); // Custom error for invalid credentials
    }

    if (user.isBaned) {
      throw new BadRequestException(
        'Tài khoản của bạn đã bị cấm, xin vui lòng gửi thư hỗ trợ',
      ); // Custom error for banned users
    }
    let isMatch = await bcrypt.compare(pass, user.pwd_h);
    if (isMatch) {
      const { pwd_h, ...result } = user.toObject(); // exclude password

      // Save Finger & Create
      if (!target_finger) {
        await this.FingerPrintModel.create({ hash, countAccount: [user.id] });
      } else {
        await this.FingerPrintModel.findByIdAndUpdate(
          target_finger.id,
          {
            countAccount: [
              ...target_finger.countAccount.filter((c) => c !== user.id),
              user.id,
            ],
          },
          { new: true, upsert: true },
        );
      }
      return result;
    }

    throw new UnauthorizedException('Vui lòng kiểm tra lại mật khẩu'); // Custom error for invalid credentials
  }

  async validataUserIsBan(uid: string) {
    const user = await this.userService.findUserOption({ _id: uid });
    if (!user) throw new UnauthorizedException('Người dùng không tồn tại');

    if (user.isBaned)
      throw new BadRequestException(
        'Tài khoản của bạn đã bị cấm, xin vui lòng gửi thư hỗ trợ',
      );
    const { pwd_h, ...res } = user.toObject();
    return res;
  }

  async validataUserName(username: string) {
    const user = await this.userService.findUserOption({ username });
    if (user) return false;
    return true;
  }

  async validataName(name: string) {
    const user = await this.userService.findUserOption({ name });
    if (user) return false;
    return true;
  }

  //function hash password
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  async checkFinger(hash: string, uid: string) {
    try {
      const target_finger = await this.FingerPrintModel.findOne({ hash });

      if (!target_finger) {
        await this.FingerPrintModel.create({ hash, countAccount: [uid] });
      } else {
        await this.FingerPrintModel.findByIdAndUpdate(
          target_finger.id,
          {
            countAccount: [
              ...target_finger.countAccount.filter((c) => c !== uid),
              uid,
            ],
          },
          { new: true, upsert: true },
        );
      }
      return true;
    } catch (err: any) {
      throw new Error(err.message);
    }
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user._id };
    await this.userService.createUserActive({
      uid: payload.sub,
      active: {
        name: 'login',
        ip_address: 'updating',
      },
    });
    return {
      access_token: this.jwtService.sign(payload),
      user: user,
    };
  }

  async resigter(payload: Resigter) {
    try {
      const { password, username, name, hash } = payload;
      const pwd_h = await this.hashPassword(password);
      const isValiDataUserName = await this.validataUserName(username);
      const isValiDataName = await this.validataName(name);
      const target_finger = await this.FingerPrintModel.findOne({ hash });
      if (target_finger && target_finger.countAccount.length > 13)
        throw new Error(
          'Bạn chỉ có thể sở hữu tối đa 2 Tài khoản trên một địa chỉ',
        );
      if (!isValiDataUserName)
        throw new Error('Tên đăng nhập đã được sử dụng!');
      if (!isValiDataName) throw new Error('Tên hiển thị đã được sử dụng!');
      const user = await this.userService.createUser({
        ...payload,
        pwd_h,
        money: 5e6,
      });
      // Save Finger & Create
      if (!target_finger) {
        await this.FingerPrintModel.create({ hash, countAccount: [user.id] });
      } else {
        await this.FingerPrintModel.findByIdAndUpdate(
          target_finger.id,
          {
            countAccount: [
              ...target_finger.countAccount.filter((c) => c !== user.id),
              user.id,
            ],
          },
          { new: true, upsert: true },
        );
      }
      await this.userService.createUserActive({
        uid: user.id,
        active: {
          name: 'resigter',
          ip_address: 'updating',
        },
      });
      return { message: 'Bạn đã đăng ký thành công', code: 0 };
    } catch (err: any) {
      throw new HttpException({ message: err.message }, HttpStatus.BAD_REQUEST);
    }
  }

  async changePwd(payload: ChangePWD) {
    const { pwd_c, pwd_n, uid } = payload;
    const target = await this.userService.findUserOption({ _id: uid });
    if (!target)
      throw new HttpException(
        { message: 'Người dùng không tồn tại', code: 400 },
        HttpStatus.BAD_REQUEST,
      );
    const pwd_n_h = await this.hashPassword(pwd_n);
    const isMatch = await bcrypt.compare(pwd_c, target.pwd_h);
    if (!isMatch)
      throw new HttpException(
        { message: 'Mật khẩu cũ không đúng', code: 400 },
        HttpStatus.BAD_REQUEST,
      );
    await this.userService.updateUserOption({ _id: uid }, { pwd_h: pwd_n_h });
    await this.userService.createUserActive({
      uid: uid,
      active: {
        name: 'change_pwd',
        ip_address: 'updating',
      },
    });
    return { message: 'Bạn đã đổi mật khẩu thành công', code: 0 };
  }

  async autoFinger(hash: string) {
    try {
      await this.FingerPrintModel.findOneAndUpdate(
        { hash },
        { hash },
        { new: true, upsert: true },
      );
    } catch (err: any) {
      console.log(err.message);
    }
  }
}
