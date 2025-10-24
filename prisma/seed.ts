import { prisma } from "@config/prisma";

const main = async () => {
    console.log("Inserindo dados...");

    await prisma.user.createMany({
        data: [{ name: "Gustavo", email: "gus@example.com" }],
        skipDuplicates: true,
    });

    console.log("Seed finalizada com sucesso!");
};

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
