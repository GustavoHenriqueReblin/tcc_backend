import type { Prisma } from "@prisma/client";
import { prisma } from "@config/prisma";
import { BaseService } from "@services/base.service";
import { cityAllowedSortFields } from "@routes/city.routes";

export class CityService extends BaseService {
    getAll = async (
        stateId: number,
        countryId?: number,
        page = 1,
        limit = 1000,
        search?: string | null,
        sortBy?: string,
        sortOrder?: "asc" | "desc",
        enterpriseId?: number
    ) =>
        this.safeQuery(
            async () => {
                const normalizedSearch = search?.trim() || undefined;
                const skip = (page - 1) * limit;

                const searchFilters: Prisma.CityWhereInput[] = [];
                if (normalizedSearch) {
                    searchFilters.push({ name: { contains: normalizedSearch } });

                    const searchNumber = Number(normalizedSearch);
                    if (!Number.isNaN(searchNumber)) {
                        searchFilters.push({ ibgeCode: searchNumber });
                    }
                }

                const where: Prisma.CityWhereInput = {
                    stateId,
                    ...(countryId ? { state: { countryId } } : {}),
                    ...(searchFilters.length ? { OR: searchFilters } : {}),
                };

                const safeSortBy =
                    sortBy && cityAllowedSortFields.includes(sortBy) ? sortBy : "name";
                const safeSortOrder = sortOrder === "desc" ? "desc" : "asc";

                const [cities, total] = await prisma.$transaction([
                    prisma.city.findMany({
                        where,
                        skip,
                        take: limit,
                        orderBy: { [safeSortBy]: safeSortOrder },
                    }),
                    prisma.city.count({ where }),
                ]);

                return {
                    items: cities,
                    meta: {
                        total,
                        page,
                        totalPages: Math.ceil(total / limit),
                    },
                };
            },
            "CITY:getAll",
            enterpriseId
        );
}
