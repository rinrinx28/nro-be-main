export class CreateClanMSG {
  uid: string;
  content: string;
  clanId: string;
  meta?: Record<string, any>;
}

export class CreateClan {
  ownerId?: string;
  meta: Record<string, any>;
}

export class UpdateClan {
  clanId: string;
  ownerId?: string;
  data: any;
}

export class AddMember {
  memberId: string;
  clanId: string;
  ownerId?: string;
}

export class RemoveMember {
  ownerId?: string;
  memberId: string;
  clanId: string;
}

export class DeleteClan {
  ownerId?: string;
  clanId: string;
}

export class TranferClan {
  ownerId?: string;
  new_ownerId: string;
  clanId: string;
}

export class CreateInviteClan {
  uid?: string;
  clanId: string;
}

export class AcpectClan {
  inviteId: string;
  ownerId?: string;
}

export class RemoveInviteClan {
  inviteId: string;
  ownerId?: string;
}
