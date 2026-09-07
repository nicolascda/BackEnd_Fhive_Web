import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config(); // Carrega o arquivo .env

const prisma = new PrismaClient(); // O Prisma já lê o process.env sozinho por baixo dos panos

export default prisma;