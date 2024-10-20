import { typeBet, typePlace } from '../schema/userBet.schema';

export interface CreateUser {
  username: string;
  name: string;
  pwd_h: string;
  server: string;
  money?: number;
}

export interface CreateUserActive {
  uid: string;
  active: Record<string, any>;
}

//TODO ———————————————[EConfig Zone]———————————————
export class CreateEConfig {
  name: string;
  option: Record<string, any>;
  description: string;
}
export class UpdateEConfig {
  id: string;
  name?: string;
  option: Record<string, any>;
  description?: string;
}

//TODO ———————————————[UserBet Zone]———————————————
export class CreateUserBet {
  betId: string;
  uid: string;
  amount: number;
  place: typePlace;
  typeBet: typeBet;
  server: string;
  meta?: Record<string, any>;
}

export class CancelUserBet {
  id: string;
  isEnd: boolean;
}
