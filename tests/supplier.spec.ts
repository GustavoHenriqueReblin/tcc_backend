import { test, expect } from "@playwright/test";
import { env } from "../src/config/env";
import { Status, PersonType, Supplier } from "@prisma/client";
import { SupplierInput } from "../src/services/supplier.service";
import { SUPPLIER_ERROR } from "../src/middleware/supplier.middleware";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://${env.DOMAIN}:${env.PORT}/api/v1`;

test("Lista fornecedores (somente ativos por padrão) e paginação básica", async ({ request }) => {
    const res = await request.get(`${baseUrl}/suppliers`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    expect(Array.isArray(data.suppliers)).toBeTruthy();
    expect(typeof data.meta.total).toBe("number");
    expect(data.meta.page).toBe(1);
    expect(data.suppliers.length).toBeLessThanOrEqual(10);
    expect(data.suppliers.every((s: Supplier) => s.status === Status.ACTIVE)).toBeTruthy();

    const resLimit1 = await request.get(`${baseUrl}/suppliers?page=1&limit=1`);
    expect(resLimit1.status()).toBe(200);
    const { data: dataLimit1 } = await resLimit1.json();
    expect(dataLimit1.meta.page).toBe(1);
    expect(dataLimit1.suppliers.length).toBe(1);

    const resHighPageZeroLimit = await request.get(`${baseUrl}/suppliers?page=5000&limit=0`);
    expect(resHighPageZeroLimit.status()).toBe(200);
    const { data: dataHighPageZeroLimit } = await resHighPageZeroLimit.json();
    expect(dataHighPageZeroLimit.meta.page).toBe(5000);
    expect(dataHighPageZeroLimit.suppliers.length).toBe(0);
});

test("Lista fornecedores com includeInactive=true retorna >= que ativos", async ({ request }) => {
    const resActive = await request.get(`${baseUrl}/suppliers`);
    expect(resActive.status()).toBe(200);
    const { data: onlyActive } = await resActive.json();

    const resAll = await request.get(`${baseUrl}/suppliers?includeInactive=true`);
    expect(resAll.status()).toBe(200);
    const { data: withInactive } = await resAll.json();

    expect(withInactive.suppliers.length).toBeGreaterThanOrEqual(onlyActive.suppliers.length);
    expect(
        withInactive.suppliers.every((s: Supplier) =>
            [Status.ACTIVE, Status.INACTIVE].includes(s.status)
        )
    ).toBeTruthy();
});

test("Validação de query: page/limit inválidos e includeInactive inválido", async ({ request }) => {
    const resNumbers = await request.get(`${baseUrl}/suppliers?page=abc&limit=xyz`);
    expect(resNumbers.status()).toBe(400);
    const bodyNumbers = await resNumbers.json();
    expect(bodyNumbers.message).toContain(SUPPLIER_ERROR.PAGINATION);

    const resIncTrueUpper = await request.get(`${baseUrl}/suppliers?includeInactive=TRUE`);
    expect(resIncTrueUpper.status()).toBe(400);
    const bodyIncTrueUpper = await resIncTrueUpper.json();
    expect(bodyIncTrueUpper.message).toContain(SUPPLIER_ERROR.INCLUDE_INACTIVE);

    const resIncInvalid = await request.get(`${baseUrl}/suppliers?includeInactive=yes`);
    expect(resIncInvalid.status()).toBe(400);
    const bodyIncInvalid = await resIncInvalid.json();
    expect(bodyIncInvalid.message).toContain(SUPPLIER_ERROR.INCLUDE_INACTIVE);
});

test("Validação de sort e sortBy", async ({ request }) => {
    const resSortOrder = await request.get(`${baseUrl}/suppliers?sortOrder=ascending`);
    expect(resSortOrder.status()).toBe(400);
    const bodySortOrder = await resSortOrder.json();
    expect(bodySortOrder.message).toContain(SUPPLIER_ERROR.SORT);

    const resSortBy = await request.get(`${baseUrl}/suppliers?sortBy=invalidField`);
    expect(resSortBy.status()).toBe(400);
    const bodySortBy = await resSortBy.json();
    expect(bodySortBy.message).toContain(SUPPLIER_ERROR.SORT_BY);
});

test("Busca fornecedor por Id existente inclui pessoa", async ({ request }) => {
    const listRes = await request.get(`${baseUrl}/suppliers`);
    expect(listRes.status()).toBe(200);
    const { data: list } = await listRes.json();
    expect(list.suppliers.length).toBeGreaterThan(0);

    const id = list.suppliers[0].id as number;
    const res = await request.get(`${baseUrl}/suppliers/${id}`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data).toBeTruthy();
    expect(data.id).toBe(id);
    expect(data.person).toBeTruthy();
});

test("Busca fornecedor por Id inexistente retorna data = null", async ({ request }) => {
    const res = await request.get(`${baseUrl}/suppliers/-9999999`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data).toBeNull();
});

test("Validação de Id do fornecedor", async ({ request }) => {
    const resInvalidId = await request.get(`${baseUrl}/suppliers/not-a-number`);
    expect(resInvalidId.status()).toBe(400);
    const bodyInvalidId = await resInvalidId.json();
    expect(bodyInvalidId.message).toContain(SUPPLIER_ERROR.ID);
});

test("Cria fornecedor com pessoa nova", async ({ request }) => {
    const uniqueTaxId = `000.${Date.now().toString().slice(-6)}-00`;
    const payload = {
        id: genId(),
        person: {
            id: genId(),
            name: "Fornecedor Novo",
            legalName: "Fornecedor Novo LTDA",
            taxId: uniqueTaxId,
            email: "fornecedor.novo@example.com",
            phone: "+55 (49) 91111-1111",
        },
        type: PersonType.BUSINESS,
        contactName: "Contato Novo",
        contactPhone: "+55 (49) 92222-2222",
        contactEmail: "contato.novo@example.com",
        status: Status.ACTIVE,
    };

    const res = await request.post(`${baseUrl}/suppliers`, { data: payload });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data).toBeTruthy();
    expect(data.person.taxId).toBe(uniqueTaxId);
    expect(data.status).toBe(Status.ACTIVE);
    expect(data.type).toBe(PersonType.BUSINESS);

    const getRes = await request.get(`${baseUrl}/suppliers/${data.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched).toBeTruthy();
    expect(fetched.person.taxId).toBe(uniqueTaxId);
});

test("Criacao de fornecedor com CPF/CNPJ ja vinculado deve falhar (409)", async ({ request }) => {
    const listRes = await request.get(`${baseUrl}/suppliers?includeInactive=true`);
    expect(listRes.status()).toBe(200);
    const { data: list } = await listRes.json();
    const existing = list.suppliers[0];
    expect(existing).toBeTruthy();

    const payload = {
        id: genId(),
        person: {
            name: existing.person.name ? `${existing.person.name} Duplicado` : "Duplicado",
            legalName: existing.person.legalName
                ? `${existing.person.legalName} Duplicado`
                : "Duplicado",
            taxId: existing.person.taxId,
        },
        contactName: "Tentativa Duplicada",
    };

    const res = await request.post(`${baseUrl}/suppliers`, { data: payload });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.error).toBeTruthy();
});

test("Atualiza fornecedor existente (campos da pessoa e do fornecedor)", async ({ request }) => {
    const uniqueTaxId = `111.${Date.now().toString().slice(-6)}-99`;
    const createPayload = {
        id: genId(),
        person: {
            id: genId(),
            name: "Fornecedor Atualizar",
            legalName: "Fornecedor Atualizar LTDA",
            taxId: uniqueTaxId,
        },
        type: PersonType.BUSINESS,
        contactName: "Contato Atualizar",
        contactPhone: "+55 (49) 95555-5555",
        contactEmail: "contato.atualizar@example.com",
        status: Status.ACTIVE,
    };
    const createRes = await request.post(`${baseUrl}/suppliers`, { data: createPayload });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();

    const updatePayload = {
        person: {
            name: "Fornecedor Atualizado",
            legalName: "Fornecedor Atualizado LTDA",
            taxId: uniqueTaxId,
            email: "fornecedor.atualizado@example.com",
        },
        type: PersonType.INDIVIDUAL,
        contactName: "Contato Atualizado",
        contactPhone: "+55 (49) 96666-6666",
        contactEmail: "contato.atualizado@example.com",
        status: Status.INACTIVE,
    };

    const updateRes = await request.put(`${baseUrl}/suppliers/${created.id}`, {
        data: updatePayload,
    });
    expect(updateRes.status()).toBe(200);
    const { data: updated } = await updateRes.json();
    expect(updated.person.name).toBe("Fornecedor Atualizado");
    expect(updated.person.legalName).toBe("Fornecedor Atualizado LTDA");
    expect(updated.person.taxId).toBe(uniqueTaxId);
    expect(updated.status).toBe(Status.INACTIVE);
    expect(updated.type).toBe(PersonType.INDIVIDUAL);
    expect(updated.contactName).toBe("Contato Atualizado");

    const listActive = await request.get(`${baseUrl}/suppliers`);
    const { data: onlyActive } = await listActive.json();
    expect(onlyActive.suppliers.find((s: Supplier) => s.id === updated.id)).toBeFalsy();

    const listAll = await request.get(`${baseUrl}/suppliers?includeInactive=true`);
    const { data: withInactive } = await listAll.json();
    expect(withInactive.suppliers.find((s: Supplier) => s.id === updated.id)).toBeTruthy();
});

test("Atualiza fornecedor inexistente deve retornar 404", async ({ request }) => {
    const payload = {
        person: { name: "Inexistente", taxId: `222.${Date.now().toString().slice(-6)}-77` },
        contactName: "N/A",
    };
    const res = await request.put(`${baseUrl}/suppliers/9999999`, { data: payload });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
});

test("Busca com search e ordenação por nome", async ({ request }) => {
    const listRes = await request.get(`${baseUrl}/suppliers?includeInactive=true`);
    expect(listRes.status()).toBe(200);
    const { data: list } = await listRes.json();

    const firstSupplier = list.suppliers[0];
    const searchTerm = firstSupplier.person.name.slice(0, 3);

    const resSearch = await request.get(
        `${baseUrl}/suppliers?search=${encodeURIComponent(searchTerm)}&sortBy=name&sortOrder=asc&includeInactive=true`
    );
    expect(resSearch.status()).toBe(200);
    const { data: searchData } = await resSearch.json();
    expect(searchData.suppliers.length).toBeGreaterThan(0);
    expect(
        searchData.suppliers.every(
            (s: SupplierInput) =>
                s.person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.person.legalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.person.taxId.toLowerCase().includes(searchTerm.toLowerCase())
        )
    ).toBeTruthy();

    const names = searchData.suppliers.map((s: SupplierInput) => s.person.name.toLowerCase());
    const sortedNames = [...names].sort();
    expect(names).toEqual(sortedNames);
});
