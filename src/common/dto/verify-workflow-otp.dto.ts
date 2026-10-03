import { IsUUID, Matches } from 'class-validator';

export class VerifyWorkflowOtpDto {
  @IsUUID()
  challenge_id!: string;

  @Matches(/^[0-9]{6}$/)
  otp!: string;
}
