import { test, expect } from "@playwright/test";
import { env } from "../src/config/env";
import { Status, PersonType, Customer } from "@prisma/client";
import { CustomerInput } from "../src/services/customer.service";
import { CUSTOMER_ERROR } from "../src/middleware/customer.middleware";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://localhost:${env.PORT}/api/v1`;

test("Lista clientes (somente ativos por padrão) e paginação básica", async ({ request }) => {
    const res = await request.get(`${baseUrl}/customers`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    expect(Array.isArray(data.items)).toBeTruthy();
    expect(typeof data.meta.total).toBe("number");
    expect(data.meta.page).toBe(1);
    expect(data.items.length).toBeLessThanOrEqual(10);
    expect(data.items.every((c: Customer) => c.status === Status.ACTIVE)).toBeTruthy();

    const resLimit1 = await request.get(`${baseUrl}/customers?page=1&limit=1`);
    expect(resLimit1.status()).toBe(200);
    const { data: dataLimit1 } = await resLimit1.json();
    expect(dataLimit1.meta.page).toBe(1);
    expect(dataLimit1.items.length).toBe(1);

    const resHighPageZeroLimit = await request.get(`${baseUrl}/customers?page=5000&limit=0`);
    expect(resHighPageZeroLimit.status()).toBe(200);
    const { data: dataHighPageZeroLimit } = await resHighPageZeroLimit.json();
    expect(dataHighPageZeroLimit.meta.page).toBe(5000);
    expect(dataHighPageZeroLimit.items.length).toBe(0);
});

test("Lista clientes com includeInactive=true retorna >= que ativos", async ({ request }) => {
    const resActive = await request.get(`${baseUrl}/customers`);
    expect(resActive.status()).toBe(200);
    const { data: onlyActive } = await resActive.json();

    const resAll = await request.get(`${baseUrl}/customers?includeInactive=true`);
    expect(resAll.status()).toBe(200);
    const { data: withInactive } = await resAll.json();

    expect(withInactive.items.length).toBeGreaterThanOrEqual(onlyActive.items.length);
    expect(
        withInactive.items.every((c: Customer) =>
            [Status.ACTIVE, Status.INACTIVE].includes(c.status)
        )
    ).toBeTruthy();
});

test("Validação de query: page/limit inválidos e includeInactive inválido", async ({ request }) => {
    const resNumbers = await request.get(`${baseUrl}/customers?page=abc&limit=xyz`);
    expect(resNumbers.status()).toBe(400);
    const bodyNumbers = await resNumbers.json();
    expect(bodyNumbers.message).toContain(CUSTOMER_ERROR.PAGINATION);

    const resIncTrueUpper = await request.get(`${baseUrl}/customers?includeInactive=TRUE`);
    expect(resIncTrueUpper.status()).toBe(400);
    const bodyIncTrueUpper = await resIncTrueUpper.json();
    expect(bodyIncTrueUpper.message).toContain(CUSTOMER_ERROR.INCLUDE_INACTIVE);

    const resIncInvalid = await request.get(`${baseUrl}/customers?includeInactive=yes`);
    expect(resIncInvalid.status()).toBe(400);
    const bodyIncInvalid = await resIncInvalid.json();
    expect(bodyIncInvalid.message).toContain(CUSTOMER_ERROR.INCLUDE_INACTIVE);
});

test("Busca cliente por Id existente inclui pessoa e endereços de entrega", async ({ request }) => {
    const listRes = await request.get(`${baseUrl}/customers`);
    expect(listRes.status()).toBe(200);
    const { data: list } = await listRes.json();
    expect(list.items.length).toBeGreaterThan(0);

    const id = list.items[0].id as number;
    const res = await request.get(`${baseUrl}/customers/${id}`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data).toBeTruthy();
    expect(data.id).toBe(id);
    expect(data.person).toBeTruthy();
    expect(Array.isArray(data.deliveryAddress)).toBeTruthy();
});

test("Busca cliente por Id inexistente retorna data = null", async ({ request }) => {
    const res = await request.get(`${baseUrl}/customers/-9999999`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data).toBeNull();
});

test("Cria cliente com pessoa nova", async ({ request }) => {
    const uniqueTaxId = `000.${Date.now().toString().slice(-6)}-00`;
    const payload = {
        id: genId(),
        person: {
            id: genId(),
            name: "Cliente Novo",
            legalName: "Cliente Novo LTDA",
            taxId: uniqueTaxId,
            email: "cliente.novo@example.com",
            phone: "(49) 91111-1111",
        },
        type: PersonType.INDIVIDUAL,
        contactName: "Contato Novo",
        contactPhone: "(49) 92222-2222",
        contactEmail: "contato.novo@example.com",
        status: Status.ACTIVE,
    };

    const res = await request.post(`${baseUrl}/customers`, { data: payload });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data).toBeTruthy();
    expect(data.person.taxId).toBe(uniqueTaxId);
    expect(data.status).toBe(Status.ACTIVE);
    expect(data.type).toBe(PersonType.INDIVIDUAL);

    const getRes = await request.get(`${baseUrl}/customers/${data.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched).toBeTruthy();
    expect(fetched.person.taxId).toBe(uniqueTaxId);
});

test("Criacao de cliente com CPF/CNPJ ja vinculado deve falhar (409)", async ({ request }) => {
    // Pega um cliente existente e tenta criar outro com o mesmo taxId da pessoa
    const listRes = await request.get(`${baseUrl}/customers?includeInactive=true`);
    expect(listRes.status()).toBe(200);
    const { data: list } = await listRes.json();
    const existing = list.items[0];
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

    const res = await request.post(`${baseUrl}/customers`, { data: payload });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.error).toBeTruthy();
});

test("Atualiza cliente existente (campos da pessoa e do cliente)", async ({ request }) => {
    // Cria um cliente de teste para atualizar em seguida
    const uniqueTaxId = `111.${Date.now().toString().slice(-6)}-99`;
    const createPayload = {
        id: genId(),
        person: {
            id: genId(),
            name: "Cliente Atualizar",
            legalName: "Cliente Atualizar LTDA",
            taxId: uniqueTaxId,
        },
        type: PersonType.BUSINESS,
        contactName: "Contato Atualizar",
        contactPhone: "(49) 95555-5555",
        contactEmail: "contato.atualizar@example.com",
        status: Status.ACTIVE,
    };
    const createRes = await request.post(`${baseUrl}/customers`, { data: createPayload });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();

    const updatePayload = {
        person: {
            name: "Cliente Atualizado",
            legalName: "Cliente Atualizado LTDA",
            taxId: uniqueTaxId, // mantém o mesmo taxId
            email: "cliente.atualizado@example.com",
        },
        type: PersonType.INDIVIDUAL,
        contactName: "Contato Atualizado",
        contactPhone: "(49) 96666-6666",
        contactEmail: "contato.atualizado@example.com",
        status: Status.INACTIVE,
    };

    const updateRes = await request.put(`${baseUrl}/customers/${created.id}`, {
        data: updatePayload,
    });
    expect(updateRes.status()).toBe(200);
    const { data: updated } = await updateRes.json();
    expect(updated.person.name).toBe("Cliente Atualizado");
    expect(updated.person.legalName).toBe("Cliente Atualizado LTDA");
    expect(updated.person.taxId).toBe(uniqueTaxId);
    expect(updated.status).toBe(Status.INACTIVE);
    expect(updated.type).toBe(PersonType.INDIVIDUAL);
    expect(updated.contactName).toBe("Contato Atualizado");

    // Verifica presenca ao listar com/sem inativos
    const listActive = await request.get(`${baseUrl}/customers`);
    const { data: onlyActive } = await listActive.json();
    expect(onlyActive.items.find((c: Customer) => c.id === updated.id)).toBeFalsy();

    const listAll = await request.get(`${baseUrl}/customers?includeInactive=true`);
    const { data: withInactive } = await listAll.json();
    expect(withInactive.items.find((c: Customer) => c.id === updated.id)).toBeTruthy();
});

test("Atualiza cliente inexistente deve retornar 404", async ({ request }) => {
    const payload = {
        person: { name: "Inexistente", taxId: `222.${Date.now().toString().slice(-6)}-77` },
        contactName: "N/A",
    };
    const res = await request.put(`${baseUrl}/customers/9999999`, { data: payload });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
});

test("Busca por search retorna somente clientes correspondentes", async ({ request }) => {
    const uniqueName = `Busca${Date.now().toString().slice(-4)}`;

    const createRes = await request.post(`${baseUrl}/customers`, {
        data: {
            id: genId(),
            person: {
                id: genId(),
                name: uniqueName,
                legalName: `${uniqueName} LTDA`,
                taxId: `888.${Date.now().toString().slice(-6)}-00`,
            },
        },
    });

    expect(createRes.status()).toBe(200);

    const res = await request.get(`${baseUrl}/customers?search=${uniqueName}`);
    expect(res.status()).toBe(200);

    const { data } = await res.json();
    expect(data.items.some((c: CustomerInput) => c.person.name === uniqueName)).toBeTruthy();
});

test("Ordenação crescente e decrescente por nome funciona corretamente", async ({ request }) => {
    const aName = "AAA Tester " + Date.now();
    const zName = "ZZZ Tester " + Date.now();

    // Cria cliente A
    await request.post(`${baseUrl}/customers`, {
        data: {
            id: genId(),
            person: {
                id: genId(),
                name: aName,
                taxId: `999.${Date.now().toString().slice(-6)}-11`,
            },
        },
    });

    // Cria cliente Z
    await request.post(`${baseUrl}/customers`, {
        data: {
            id: genId(),
            person: {
                id: genId(),
                name: zName,
                taxId: `999.${Date.now().toString().slice(-6)}-22`,
            },
        },
    });

    // ASC
    const ascRes = await request.get(`${baseUrl}/customers?sortBy=name&sortOrder=asc`);
    expect(ascRes.status()).toBe(200);

    const ascList = (await ascRes.json()).data.items;
    expect(ascList[0].person.name).toBe(aName);

    // DESC
    const descRes = await request.get(`${baseUrl}/customers?sortBy=name&sortOrder=desc`);
    expect(descRes.status()).toBe(200);

    const descList = (await descRes.json()).data.items;
    expect(descList[0].person.name).toBe(zName);
});

test("sortBy inválido deve retornar 400", async ({ request }) => {
    const res = await request.get(`${baseUrl}/customers?sortBy=campoInvalido`);
    expect(res.status()).toBe(400);

    const body = await res.json();
    expect(body.message).toContain(CUSTOMER_ERROR.SORT_BY);
});

test("validateCustomerQuery: ID inválido deve retornar 400", async ({ request }) => {
    const res = await request.get(`${baseUrl}/customers/abc`);
    expect(res.status()).toBe(400);

    const body = await res.json();
    expect(body.message).toBe(CUSTOMER_ERROR.ID);
});

test("validateCustomerQuery: ID válido deve retornar cliente ou null", async ({ request }) => {
    const listRes = await request.get(`${baseUrl}/customers`);
    expect(listRes.status()).toBe(200);

    const { data: list } = await listRes.json();
    const validId = list.items[0]?.id ?? 1;

    const res = await request.get(`${baseUrl}/customers/${validId}`);
    expect([200]).toContain(res.status());
});
