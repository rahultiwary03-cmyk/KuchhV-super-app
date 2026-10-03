import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

@Injectable()
export class FcmService {
  constructor(private readonly configService: ConfigService) {}

  async sendPushNotification(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    if (!fcmToken.trim()) {
      throw new BadRequestException('FCM token is required');
    }

    const app =
      getApps()[0] ??
      initializeApp({
        credential: applicationDefault(),
        projectId: this.configService.get<string>('FIREBASE_PROJECT_ID'),
      });

    const response = await getMessaging(app).send({
      notification: { title, body },
      ...(data ? { data } : {}),
      token: fcmToken,
    });

    return { success: true, response };
  }
}
