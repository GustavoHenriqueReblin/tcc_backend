import { test, expect } from "@playwright/test";
import { env } from "../src/config/env";
import { Status, Customer } from "@prisma/client";
import { CustomerInput } from "../src/services/customer.service";

test("Lista/Paginação dos clientes", async ({ request }) => {
    const res = await request.get(`http://${env.DOMAIN}:${env.PORT}/api/v1/customers`);
    const { data } = await res.json();

    expect(res.status()).toBe(200);
    expect(data.meta.total).toBe(data.customers.length);
    expect(data.customers.length).toBe(2); // Somente 2 ativos

    const resLimit1 = await request.get(`http://${env.DOMAIN}:${env.PORT}/api/v1/customers?page=1&limit=1`);
    const { data: dataLimit1 } = await resLimit1.json();

    expect(resLimit1.status()).toBe(200);
    // expect(dataLimit1.meta.total).toBe(3);
    expect(dataLimit1.meta.page).toBe(1);
    expect(dataLimit1.customers.length).toBe(1);

    const resWrongPage = await request.get(`http://${env.DOMAIN}:${env.PORT}/api/v1/customers?page=5000&limit=0`);
    const { data: dataWrongPage } = await resWrongPage.json();

    expect(resWrongPage.status()).toBe(200);
    // expect(dataWrongPage.meta.total).toBe(3);
    expect(dataWrongPage.meta.page).toBe(5000);
    expect(dataWrongPage.customers.length).toBe(0);
});

test("Deve reativar um cliente inativo e retornar na listagem de ativos", async ({ request }) => {
    // Busca todos os clientes, inclusive inativos
    const resCustomers = await request.get(
        `http://${env.DOMAIN}:${env.PORT}/api/v1/customers?includeInactive=true`
    );
    expect(resCustomers.status()).toBe(200);

    const { data: customersData } = await resCustomers.json();
    const inactiveCustomer: Customer | undefined = customersData.customers.find(
        (c: Customer) => c.status === Status.INACTIVE
    );

    expect(customersData.customers.length).toBe(3);
    expect(customersData.meta.total).toBe(customersData.customers.length);
    expect(inactiveCustomer).toBeDefined();

    // Reativa o cliente
    const updateResponse = await request.put(
        `http://${env.DOMAIN}:${env.PORT}/api/v1/customers/${inactiveCustomer!.id}`,
        {
            data: {
                contactEmail: "changed@email.com",
                contactName: "Changed Name",
                contactPhone: "55 (49) 99191-9191",
                status: Status.ACTIVE,
                type: "INDIVIDUAL",
                person: {
                    name: "Supermercado União Changed",
                    legalName: "Supermercado União LTDA Changed",
                    taxId: "000.000.000-00",
                    dateOfBirth: new Date("2025-02-28"),
                },
            } as CustomerInput,
        }
    );

    expect(updateResponse.status()).toBe(200);

    // Busca novamente a lista de clientes (sem includeInactive)
    const resActive = await request.get(`http://${env.DOMAIN}:${env.PORT}/api/v1/customers`);
    expect(resActive.status()).toBe(200);

    const { data: activeData } = await resActive.json();
    expect(activeData.customers.length).toBe(3);

    // Valida que o cliente reativado aparece como ativo e com nome alterado
    const updatedCustomer = activeData.customers.find(
        (c: Customer) => c.id === inactiveCustomer!.id
    );

    // Valida dados alterados do cliente e da pessoa vinculada
    expect(updatedCustomer).toBeDefined();
    expect(updatedCustomer!.status).toBe(Status.ACTIVE);
    expect(updatedCustomer!.contactName).toBe("Changed Name");
    expect(updatedCustomer!.contactEmail).toBe("changed@email.com");
    expect(updatedCustomer!.person.name).toBe("Supermercado União Changed");
    expect(updatedCustomer!.person.legalName).toBe("Supermercado União LTDA Changed");
    expect(updatedCustomer!.person.taxId).toBe("000.000.000-00");
    expect(new Date(updatedCustomer!.person.dateOfBirth).getTime()).toBe(
        new Date("2025-02-28").getTime()
    );
});
