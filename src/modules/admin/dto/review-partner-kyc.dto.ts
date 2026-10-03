import { IsEnum } from 'class-validator';

export enum PartnerKycAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ReviewPartnerKycDto {
  @IsEnum(PartnerKycAction)
  action!: PartnerKycAction;
}
