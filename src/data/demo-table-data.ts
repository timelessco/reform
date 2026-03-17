type Person = {
  id: number;
  firstName: string;
  lastName: string;
  age: number;
  visits: number;
  progress: number;
  status: "relationship" | "complicated" | "single";
  subRows?: Person[];
};

const range = (len: number) => {
  const arr: number[] = [];
  for (let i = 0; i < len; i++) {
    arr.push(i);
  }
  return arr;
};

const newPerson = async (num: number): Promise<Person> => {
  const { faker } = await import("@faker-js/faker");
  return {
    id: num,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    age: faker.number.int(40),
    visits: faker.number.int(1000),
    progress: faker.number.int(100),
    status:
      faker.helpers.shuffle<Person["status"]>(["relationship", "complicated", "single"])[0] ??
      "single",
  };
};

const _makeData = async (...lens: number[]) => {
  const makeDataLevel = async (depth = 0): Promise<Person[]> => {
    const len = lens[depth] ?? 0;
    return Promise.all(
      range(len).map(
        async (index): Promise<Person> => ({
          ...(await newPerson(index)),
          subRows: lens[depth + 1] ? await makeDataLevel(depth + 1) : undefined,
        }),
      ),
    );
  };

  return makeDataLevel();
};
