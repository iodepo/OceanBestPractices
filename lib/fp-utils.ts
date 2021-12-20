export const map = <A, B>(f: (a: A) => B, as: A[]): B[] => as.map((a) => f(a));
