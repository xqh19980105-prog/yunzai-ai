import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LegalService {
  private readonly REQUIRED_SIGNATURE_TEXT = '我承诺合法使用';

  constructor(private prisma: PrismaService) {}

  /**
   * Sign legal affidavit - Save to LegalLog and update user isLegalSigned
   */
  async signLegalAffidavit(
    userId: string,
    signatureText: string,
    ip: string,
    userAgent?: string,
  ) {
    // Validate signature text must match exactly
    if (signatureText.trim() !== this.REQUIRED_SIGNATURE_TEXT) {
      throw new ForbiddenException('签名文字不匹配，请重新输入');
    }

    // Save to LegalLog (Forensic Evidence)
    await this.prisma.legalLog.create({
      data: {
        userId,
        signatureText,
        ip,
        userAgent,
      },
    });

    // Update user isLegalSigned = true
    await this.prisma.user.update({
      where: { id: userId },
      data: { isLegalSigned: true },
    });

    return { success: true };
  }

  /**
   * Get legal text from SystemConfig
   */
  async getLegalText(): Promise<string> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'legal_affidavit_text' },
    });

    if (!config) {
      // Return default text if not configured
      return `您需对使用本服务产生的所有内容承担完全责任，并保证不会利用本服务进行任何
侵犯版权、知识产权或违反法律法规的行为。

如因您的使用行为导致任何法律纠纷或损失，您将承担全部法律责任。`;
    }

    return config.value;
  }

  /**
   * Update legal text in SystemConfig
   */
  async updateLegalText(text: string): Promise<void> {
    await this.prisma.systemConfig.upsert({
      where: { key: 'legal_affidavit_text' },
      update: { value: text },
      create: {
        key: 'legal_affidavit_text',
        value: text,
      },
    });
  }
}
