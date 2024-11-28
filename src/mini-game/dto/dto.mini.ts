import { MinLength } from 'class-validator';

export type typeBet = 'cl' | 'g' | 'x';

export type typePlace =
  | 'C'
  | 'L'
  | 'T'
  | 'X'
  | 'CT'
  | 'CX'
  | 'LT'
  | 'LX'
  | string;

export class Place {
  server: string;
  typeBet: typeBet;
  amount: number;
  uid?: string;
  betId: string;

  @MinLength(1, { message: 'Vui lòng đặt cược' })
  place: typePlace;

  clientId?: string;
}

export class Cancel {
  uid?: string;
  userBetId: string;

  clientId?: string;
}
