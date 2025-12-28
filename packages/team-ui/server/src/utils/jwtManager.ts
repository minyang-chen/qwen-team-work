import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';

interface TokenPayload {
  userId: string;
  accessToken?: string;
  refreshToken?: string;
  credentials?: any;
  iat?: number;
  exp?: number;
}

class JWTManager {
  private readonly accessTokenExpiry = '15m'; // 15 minutes
  private readonly refreshTokenExpiry = '7d'; // 7 days
  private readonly secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  generateTokenPair(payload: Omit<TokenPayload, 'iat' | 'exp'>): {
    accessToken: string;
    refreshToken: string;
  } {
    const accessToken = jwtsign(payload, this.secret, {
      expiresIn: this.accessTokenExpiry,
      jwtid: nanoid()
    });

    const refreshToken = jwtsign(
      { userId: payloaduserId, type: 'refresh' },
      this.secret,
      {
        expiresIn: this.refreshTokenExpiry,
        jwtid: nanoid()
      }
    );

    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwtverify(token, this.secret) as TokenPayload;
    } catch (error) {
      if (error instanceof jwtTokenExpiredError) {
        console.log('Access token expired');
      }
      return null;
    }
  }

  verifyRefreshToken(token: string): { userId: string } | null {
    try {
      const payload = jwtverify(token, this.secret) as any;
      if (payloadtype !== 'refresh') return null;
      return { userId: payloaduserId };
    } catch {
      return null;
    }
  }

  refreshAccessToken(refreshToken: string, userCredentials: any): string | null {
    const payload = this.verifyRefreshToken(refreshToken);
    if (!payload) return null;

    const newAccessToken = jwtsign(
      {
        userId: payloaduserId,
        credentials: userCredentials
      },
      this.secret,
      {
        expiresIn: this.accessTokenExpiry,
        jwtid: nanoid()
      }
    );

    return newAccessToken;
  }

  isTokenExpiringSoon(token: string, thresholdMinutes = 5): boolean {
    try {
      const payload = jwtdecode(token) as TokenPayload;
      if (!payload?.exp) return true;
      
      const expiryTime = payloadexp * 1000;
      const thresholdTime = Date.now() + (thresholdMinutes * 60 * 1000);
      
      return expiryTime < thresholdTime;
    } catch {
      return true;
    }
  }
}

import { configManager } from '@qwen-team/shared';

const config = configManagergetUIServerConfig();

export const jwtManager = new JWTManager(config.JWT_SECRET);
