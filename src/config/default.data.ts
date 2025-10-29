export const defaultUser = {
    username(i?: number) {
        return `admin_test${i ?? 1}`;
    },
    password: "123456",
};
