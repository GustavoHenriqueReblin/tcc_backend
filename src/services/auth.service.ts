import * as jwt from "jsonwebtoken";
import { BaseService } from "@services/base.service";
import { env } from "@config/env";
import bcrypt from "bcrypt";
import { parseTimeToMs } from "@utils/functions";
import { AppError } from "@utils/appError";

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
            if (!user || !isValid) throw new AppError("Credenciais inválidas");

            const existingToken = await this.prisma.token.findFirst({
                where: { userId: user.id, valid: true },
                include: { user: true, enterprise: true },
            });

            let token = existingToken?.token;
            if (!token) {
                const payload: TokenPayload = {
                    sub: user.id,
                    username: user.username,
                    role: user.role,
                    enterpriseId: user.enterpriseId,
                };

                token = jwt.sign(payload, env.APP_SECRET, {
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
            }

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

    logout = async (token: string) =>
        this.safeQuery(async () => {
            let decoded: TokenPayload | undefined = undefined;

            try {
                const payload = jwt.verify(token, env.APP_SECRET);
                if (typeof payload === "string") {
                    throw new AppError("Token inválido", 401);
                }

                decoded = payload as unknown as TokenPayload;
            } catch {
                // ignore
            }

            await this.prisma.token.deleteMany({
                where: { token },
            });

            if (decoded) {
                await this.prisma.audit.create({
                    data: {
                        userId: decoded.sub,
                        enterpriseId: decoded.enterpriseId,
                        action: `User ${decoded.username} has logged out`,
                        entity: "Auth",
                    },
                });
            }

            return { message: "User logouted successfully" };
        }, "AUTH:logout");
}
