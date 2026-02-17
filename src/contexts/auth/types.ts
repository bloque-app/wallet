type LoginEmail = {
  email: string;
};

type LoginPhone = {
  phone: string;
};

export type LoginData = (LoginEmail | LoginPhone) & {
  code: string;
};
