import * as jwt from "jsonwebtoken";
import { BaseService } from "@services/base.service";
import { env } from "@config/env";
import bcrypt from "bcrypt";
import { parseTimeToMs } from "@utils/functions";

interface TokenPayload {
    sub: number;
    username: string;
    role: string;
    enterpriseId: number;
}

export class AuthService extends BaseService {
    login = async (username: string, password: string) => {
        return this.safeQuery(async () => {
            const user = await this.prisma.user.findUnique({
                where: { username },
                include: { person: true, enterprise: true },
            });

            const isValid = await bcrypt.compare(env.APP_SECRET + password, user?.password ?? "");
            if (!user || !isValid) throw new Error("Invalid credentials");

            const payload: TokenPayload = {
                sub: user.id,
                username: user.username,
                role: user.role,
                enterpriseId: user.enterpriseId,
            };

            const token = jwt.sign(payload, env.APP_SECRET, {
                expiresIn: env.JWT_EXPIRES_IN,
            } as jwt.SignOptions);

            const expiresAt = new Date(Date.now() + parseTimeToMs(env.JWT_EXPIRES_IN));

            await this.prisma.token.create({
                data: {
                    userId: user.id,
                    token,
                    expiresAt,
                    valid: true,
                    enterpriseId: user.enterpriseId,
                },
            });

            await this.prisma.audit.create({
                data: {
                    userId: user.id,
                    enterpriseId: user.enterpriseId,
                    action: `User ${user.username} has logged in`,
                },
            });

            return {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    status: user.status,
                    personName: user.person?.name ?? null,
                    enterpriseName: user.enterprise?.name ?? null,
                },
            };
        }, "AUTH:login");
    };
}
