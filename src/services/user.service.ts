import { BaseService } from "@services/base.service";
import { Status } from "@prisma/client";

export class UserService extends BaseService {
    async getAll() {
        return this.safeQuery(
            () => this.prisma.user.findMany({ include: { person: true, enterprise: true } }),
            "USER:getAll"
        );
    }

    async create(data: {
        username: string;
        password: string;
        personId: number;
        enterpriseId: number;
    }) {
        return this.safeQuery(
            () =>
                this.prisma.user.create({
                    data: { ...data, status: Status.ACTIVE },
                }),
            "USER:create"
        );
    }
}
