import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/security";
import {
  userPreferenceSchema,
  userRegisterSchema,
  userLoginSchema,
} from "@/lib/validators/users";

export async function registerUser(input: unknown) {
  const payload = userRegisterSchema.parse(input);
  const hashedPassword = await hashPassword(payload.password);
  return prisma.user.create({
    data: {
      email: payload.email,
      username: payload.username,
      hashedPassword,
      homeLat: payload.homeLat,
      homeLng: payload.homeLng,
      bankrollProfile: payload.bankrollProfile,
      riskTolerance: payload.riskTolerance,
      preferredStakesMin: payload.preferredStakesMin,
      preferredStakesMax: payload.preferredStakesMax,
      maxTravelDistance: payload.maxTravelDistance,
      preferredStartTimes: payload.preferredStartTimes ?? [],
    },
    select: {
      id: true,
      email: true,
      username: true,
      bankrollProfile: true,
      riskTolerance: true,
      preferredStakesMin: true,
      preferredStakesMax: true,
      maxTravelDistance: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function loginUser(input: unknown) {
  const payload = userLoginSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { email: payload.email } });
  if (!user || !user.hashedPassword) {
    throw new Error("Invalid credentials");
  }
  const isValid = await verifyPassword(payload.password, user.hashedPassword);
  if (!isValid) {
    throw new Error("Invalid credentials");
  }
  const { hashedPassword: _hashedPassword, ...safeUser } = user;
  void _hashedPassword;
  return safeUser;
}

export async function getUserProfile(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function updateUserPreferences(input: unknown) {
  const payload = userPreferenceSchema.parse(input);
  return prisma.user.update({
    where: { id: payload.userId },
    data: {
      bankrollProfile: payload.bankrollProfile,
      riskTolerance: payload.riskTolerance,
      preferredStakesMin: payload.preferredStakesMin,
      preferredStakesMax: payload.preferredStakesMax,
      maxTravelDistance: payload.maxTravelDistance,
      preferredStartTimes: payload.preferredStartTimes ?? [],
      preferredVariants: payload.preferredVariants ?? [],
    },
  });
}
