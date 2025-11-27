import type { Prisma } from "@prisma/client";
import { prisma } from "@config/prisma";
import { BaseService } from "@services/base.service";
import { stateAllowedSortFields } from "@routes/state.routes";

export class StateService extends BaseService {
    getAll = async (
        countryId: number,
        page = 1,
        limit = 100,
        search?: string | null,
        sortBy?: string,
        sortOrder?: "asc" | "desc",
        enterpriseId?: number
    ) =>
        this.safeQuery(
            async () => {
                const normalizedSearch = search?.trim() || undefined;
                const skip = (page - 1) * limit;

                const searchFilters: Prisma.StateWhereInput[] = [];
                if (normalizedSearch) {
                    searchFilters.push(
                        { name: { contains: normalizedSearch } },
                        { uf: { contains: normalizedSearch } }
                    );

                    const searchNumber = Number(normalizedSearch);
                    if (!Number.isNaN(searchNumber)) {
                        searchFilters.push({ ibgeCode: searchNumber });
                    }
                }

                const where: Prisma.StateWhereInput = {
                    countryId,
                    ...(searchFilters.length ? { OR: searchFilters } : {}),
                };

                const safeSortBy =
                    sortBy && stateAllowedSortFields.includes(sortBy) ? sortBy : "name";
                const safeSortOrder = sortOrder === "desc" ? "desc" : "asc";

                const [states, total] = await prisma.$transaction([
                    prisma.state.findMany({
                        where,
                        skip,
                        take: limit,
                        orderBy: { [safeSortBy]: safeSortOrder },
                    }),
                    prisma.state.count({ where }),
                ]);

                return {
                    items: states,
                    meta: {
                        total,
                        page,
                        totalPages: Math.ceil(total / limit),
                    },
                };
            },
            "STATE:getAll",
            enterpriseId
        );
}
