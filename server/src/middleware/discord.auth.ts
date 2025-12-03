import { Request, Response, NextFunction } from 'express';
import nacl from 'tweetnacl';

export interface DiscordAuthRequest extends Request {
  discordUser?: {
    id: string;
    username: string;
    avatar?: string;
    guildId?: string;
    channelId?: string;
  };
}

/**
 * Middleware to verify Discord interaction signatures
 * Discord sends signed requests that we need to verify
 */
export const verifyDiscordSignature = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const signature = req.headers['x-signature-ed25519'] as string;
  const timestamp = req.headers['x-signature-timestamp'] as string;
  const publicKey = process.env.DISCORD_PUBLIC_KEY;

  if (!signature || !timestamp || !publicKey) {
    return res.status(401).json({ error: 'Invalid request signature' });
  }

  try {
    const body = JSON.stringify(req.body);
    const isValid = nacl.sign.detached.verify(
      Buffer.from(timestamp + body),
      Buffer.from(signature, 'hex'),
      Buffer.from(publicKey, 'hex')
    );

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    return next();
  } catch (error) {
    console.error('Discord signature verification error:', error);
    return res.status(401).json({ error: 'Signature verification failed' });
  }
};

/**
 * Middleware to extract Discord user info from request
 * For Activity SDK, user info comes from the SDK authentication
 */
export const extractDiscordUser = (
  req: DiscordAuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authentication token' });
  }

  try {
    // In production, verify the JWT token from Discord SDK
    // For now, we'll extract basic info from the token payload
    // const token = authHeader.substring(7);
    
    // TODO: Implement proper JWT verification with Discord's public key
    // const decoded = jwt.verify(token, discordPublicKey);
    
    // For development, we'll accept the user info from request body
    const { discordId, discordUsername, discordAvatar, guildId, channelId } = req.body;
    
    if (!discordId) {
      return res.status(401).json({ error: 'Invalid user data' });
    }

    req.discordUser = {
      id: discordId,
      username: discordUsername || 'Unknown',
      avatar: discordAvatar,
      guildId,
      channelId,
    };

    return next();
  } catch (error) {
    console.error('Discord user extraction error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

