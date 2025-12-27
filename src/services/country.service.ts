import { prisma } from "@config/prisma";
import { BaseService } from "@services/base.service";
import { countryAllowedSortFields } from "@routes/country.routes";

export class CountryService extends BaseService {
    getAll = async (
        page = 1,
        limit = 50,
        search?: string | null,
        sortBy?: string,
        sortOrder?: "asc" | "desc",
        enterpriseId?: number
    ) =>
        this.safeQuery(
            async () => {
                const normalizedSearch = search?.trim() || undefined;
                const skip = (page - 1) * limit;

                const where = normalizedSearch
                    ? {
                          OR: [
                              { name: { contains: normalizedSearch } },
                              { isoCode: { contains: normalizedSearch } },
                          ],
                      }
                    : {};

                const safeSortBy =
                    sortBy && countryAllowedSortFields.includes(sortBy) ? sortBy : "name";
                const safeSortOrder = sortOrder === "desc" ? "desc" : "asc";

                const [countries, total] = await prisma.$transaction([
                    prisma.country.findMany({
                        where,
                        skip,
                        take: limit,
                        orderBy: { [safeSortBy]: safeSortOrder },
                    }),
                    prisma.country.count({ where }),
                ]);

                return {
                    items: countries,
                    meta: {
                        total,
                        page,
                        totalPages: Math.ceil(total / limit),
                    },
                };
            },
            "COUNTRY:getAll",
            enterpriseId
        );
}
