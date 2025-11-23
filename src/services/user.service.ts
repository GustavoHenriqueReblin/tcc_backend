import { BaseService } from "@services/base.service";
import { Status } from "@prisma/client";
import { userAllowedSortFields, userPersonAllowedSortFields } from "@routes/user.routes";

export class UserService extends BaseService {
    async getAll(
        enterpriseId: number,
        page = 1,
        limit = 10,
        includeInactive = false,
        search?: string | null,
        sortBy?: string,
        sortOrder?: "asc" | "desc"
    ) {
        return this.safeQuery(
            async () => {
                search = search?.trim() || null;
                sortBy = sortBy || "createdAt";
                sortOrder = sortOrder || "desc";

                const skip = (page - 1) * limit;

                const where = {
                    enterpriseId,
                    ...(includeInactive ? {} : { status: Status.ACTIVE }),
                    ...(search
                        ? {
                              OR: [
                                  { person: { name: { contains: search } } },
                                  { username: { contains: search } },
                              ],
                          }
                        : {}),
                };

                const validSortFields = userPersonAllowedSortFields.concat(userAllowedSortFields);
                const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";
                const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

                const orderBy = userPersonAllowedSortFields.includes(safeSortBy)
                    ? { person: { [safeSortBy]: { sort: safeSortOrder } } }
                    : { [safeSortBy]: safeSortOrder };

                const [users, total] = await this.prisma.$transaction([
                    this.prisma.user.findMany({
                        where,
                        skip,
                        take: limit,
                        orderBy,
                        include: { person: true, enterprise: true },
                    }),
                    this.prisma.user.count({ where }),
                ]);

                return {
                    items: users,
                    meta: {
                        total,
                        page,
                        totalPages: Math.ceil(total / limit),
                    },
                };
            },
            "USER:getAll",
            enterpriseId
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
