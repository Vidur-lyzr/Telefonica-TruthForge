export interface AuthUser {
  email: string;
  team: "telefonica" | "accenture";
  passwordHash: string;
}

export const AUTH_USERS: AuthUser[] = [
  {
    email: "macarena.alvarezaviles@telefonica.com",
    team: "telefonica",
    passwordHash:
      "scrypt:0e9265d02650c41e2fb9095c28a0ca78:6d4b059655f4ccf3644f55ffbb5611f2db88bba91e7ce4482cb3b9abd5bbf3d2",
  },
  {
    email: "alberto.gimenotunon@telefonica.com",
    team: "telefonica",
    passwordHash:
      "scrypt:3eb54e93d652e49e21a91d8a6a570655:6d82ecb0e26fb532992e97140ab7c41a9417b5e1befc43766b7225101f92a734",
  },
  {
    email: "rfalarcon@telefonica.com",
    team: "telefonica",
    passwordHash:
      "scrypt:47b0692a5c197108ba4892ab864da5d2:17201aaee4876dee7bb156176e2ea434ed8f9b9c74249d8b07cd2168c6286f9b",
  },
  {
    email: "sara.valinamonzon@telefonica.com",
    team: "telefonica",
    passwordHash:
      "scrypt:5582fb0d5185807352cee1103f80e508:8ecf5720b8032b7980e2b78674df30850fab134ae3d774f784272390e9adae00",
  },
  {
    email: "patricia.martinwalter@telefonica.com",
    team: "telefonica",
    passwordHash:
      "scrypt:56118e0486db901e516f5bb5a0533074:28de477efd74c84d97324b880ea0acc1010d46da0dd1ae9240f0d4fa050572c9",
  },
  {
    email: "miguel.hernandezubieto@telefonica.com",
    team: "telefonica",
    passwordHash:
      "scrypt:8bb554cad546e5bc11182adbc5858e91:54f82ed5a0df06065d5442e31c905cfa238dbbf84571be399d274f5bb91d79c9",
  },
  {
    email: "marcos.diaz-raseronsanchez@telefonica.com",
    team: "telefonica",
    passwordHash:
      "scrypt:f6b5bd3759b097fc62e5eea55e88c89d:89139fca2777afafc9903258025c9a9ced202850e79dda582c386aed834bc965",
  },
  {
    email: "sergio.sanchez@telefonica.com",
    team: "telefonica",
    passwordHash:
      "scrypt:af15edf5fe6f3b24a874a1b0b39df76b:aa2ce1f5b0f7b8d8d9dc907a8cc5940e6ad0ac216e2331efc158f5431285c0ba",
  },
  {
    email: "oscar.candilesjimenez@telefonica.com",
    team: "telefonica",
    passwordHash:
      "scrypt:aaeacfe211a4d2950002045872102468:fd75c3113af89952cc6c0285ed59de663da52dd7e2570efa141e19d52975adc5",
  },
  {
    email: "ana.martinmartinez@telefonica.com",
    team: "telefonica",
    passwordHash:
      "scrypt:4e892dedf6cd706cc6749515b231b0f2:c1f076885d1e85575f124482da2ce6a6bd9d53da82dc128be480c9dbb62388e1",
  },
  {
    email: "juan.rovira.blanco@accenture.com",
    team: "accenture",
    passwordHash:
      "scrypt:91b72598bf6b420feee04a2bfc6546fc:e3c6ea86848e90eda6c7056616c7071b11bc79c066e719690082a5cd7a1218cf",
  },
  {
    email: "c.sciabbarrasi@accenture.com",
    team: "accenture",
    passwordHash:
      "scrypt:bb47a48b6e0fec281c74c65e49fd6dfb:2cfe9b7aa240bf9d2fe95135868503eba0a100d1bbdcfc05fa69063e33d32c32",
  },
  {
    email: "borja.lizarraga@accenture.com",
    team: "accenture",
    passwordHash:
      "scrypt:5365a890624afd683ac2c24a908c1894:52f55cebd6f355b6d0a7f026003d35b85a50a12b98e35bc22ffe43cd88e566f1",
  },
  {
    email: "jose.vicente.moreno@accenture.com",
    team: "accenture",
    passwordHash:
      "scrypt:52685dcf81d32c2cd0ad459354550127:00dd5314a87018aca42568111776f1b7702938530ab21420545b22142cad1cc1",
  },
  {
    email: "andrea.a.romero@accenture.com",
    team: "accenture",
    passwordHash:
      "scrypt:81a8f60a29b6907d24870cdc2a100c00:87d52f518e442fd444b3a177946acb54c67cbcf0696e95e914532f6db1380d14",
  },
];

// Anyone with an email on an official Lyzr domain may sign in with the shared
// Lyzr access password. Domain match is exact (or subdomain), never substring.
export const LYZR_DOMAINS = ["lyzr.ai", "lyzr.com"];

export const LYZR_PASSWORD_HASH =
  "scrypt:c387402faacc0bd6b224d927c940f725:3fb52a7de7486d1c54e952aa7fcf863dac50e77ef4710ab1d4198258baeb9876";

export function isLyzrEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 1) return false;
  const domain = email.slice(at + 1).toLowerCase();
  return LYZR_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}

export function findAuthUser(email: string): AuthUser | undefined {
  const normalized = email.trim().toLowerCase();
  return AUTH_USERS.find((u) => u.email === normalized);
}
