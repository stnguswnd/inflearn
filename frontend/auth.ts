import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import { comparePassword } from "@/lib/password-utils"; 

export const { handlers, auth, signIn, signOut } = NextAuth({
  useSecureCookies: process.env.NODE_ENV === "production",
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: {
          label: "이메일",
          type: "email",
          placeholder: "이메일 입력",
        },
        password: {
          label: "비밀번호",
          type: "password",
        },
      },
      async authorize(credentials) {
        try {
          // 1. 모든 값들이 정상적으로 들어왔는가?
          if (!credentials || !credentials.email || !credentials.password) {
            return null;
          }

          // 2. DB에서 유저를 찾기
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email as string,
            },
          });

          if (!user) {
            return null;
          }

          // 3. 비밀번호 일치 여부 확인
          const passwordMatch = comparePassword(
            credentials.password as string,
            user.hashedPassword as string
          );

          if (!passwordMatch) {
            return null;
          }

          return user;
        } catch (error) {
          console.error("인증 오류:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/signin",
  },
  callbacks: {},
});
