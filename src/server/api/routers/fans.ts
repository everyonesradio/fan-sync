// ** Third-Party Imports
import { TRPCError } from "@trpc/server";
import { z } from "zod";

// ** Custom Components, Hooks, Utils, etc.
import { WelcomeEmail, WelcomeEmailSubject } from "@/server/emails/welcome";
import { EmailService } from "@/server/services/email";
// import { ExportService } from "@/server/services/export-license";
// import { StorageService } from "@/server/services/storage";
// import {
//   formidableConfig,
//   formidablePromise,
//   fileConsumer,
// } from "@lib/formidable";

// ** Local Imports
import { createTRPCRouter, publicProcedure } from "../trpc";

/**
 * The `fansRouter` defines the tRPC API route related to fan management in the FanSync application.
 * It provides procedures for creating, retrieving, and updating fan data, as well as handling related operations.
 *
 * Features:
 * - `get`: Retrieves a fan's data by their unique identifier (UUID). Throws a `NOT_FOUND` error if the fan does not exist.
 * - `uploadAvatar`: Handles the upload of a fan's avatar image, validating file size and uploading to storage.
 * - `create`: Creates a new fan record with provided details, ensuring no duplicate entries by UUID.
 * - `anthem`: Updates a fan's anthem information, including track details and associated metadata.
 * - `signature`: Updates a fan's signature information.
 * - `email`: Sends a welcome email to the fan, including their anthem details and license ID.
 * - `exportLicense`: Generates and returns a license document for the fan based on provided data and background selection.
 * -  `validate`: Validates if username exists to prevent duplicate usernames being stored
 *
 * @returns A tRPC router object with defined procedures for fan-related operations.
 */

export const fansRouter = createTRPCRouter({
  get: publicProcedure
    .input(
      z.object({
        uuid: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const fanData = await ctx.prisma.fan.findUnique({
        where: {
          uuid: input.uuid,
        },
      });

      if (!fanData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "This fan does not exist",
        });
      }

      return fanData;
    }),

  validate: publicProcedure
    .input(
      z.object({
        username: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.fan.findFirst({
        where: { username: input.username },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This username already exists",
        });
      }

      return;
    }),

  // uploadAvatar: publicProcedure
  //   .input(
  //     z.object({
  //       file: z.instanceof(Buffer),
  //       filename: z.string(),
  //     })
  //   )
  //   .mutation(async ({ input }) => {
  //     const chunks: never[] = [];
  //     const { fields: _fields, files } = await formidablePromise(req, {
  //       ...formidableConfig,
  //       fileWriteStreamHandler: () => fileConsumer(chunks),
  //     });
  //     const file = files.file;
  //     const fileBuffer = Buffer.concat(chunks);

  //     if (!file?.[0]) {
  //       throw new TRPCError({
  //         code: "BAD_REQUEST",
  //         message: "No File Provided",
  //       });
  //     }

  //     if (file[0].size > 5 * 1024 * 1024) {
  //       throw new TRPCError({
  //         code: "BAD_REQUEST",
  //         message: "File size exceeds the limit of 5 MB.",
  //       });
  //     }

  //     const result = await StorageService.uploadFile(
  //       fileBuffer,
  //       file[0].originalFilename!
  //     );
  //     return result;
  //   }),

  create: publicProcedure
    .input(
      z.object({
        uuid: z.string(),
        profilePicture: z.string(),
        dob: z.string(),
        email: z.string().email(),
        fullname: z.string(),
        location: z.string(),
        username: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const exists = await ctx.prisma.fan.findUnique({
        where: { uuid: input.uuid },
      });

      if (exists) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This fan already exists",
        });
      }

      const newFan = await ctx.prisma.fan.create({
        data: {
          ...input,
          timestamp: new Date(),
        },
      });

      return newFan;
    }),

  anthem: publicProcedure
    .input(
      z.object({
        uuid: z.string(),
        anthem: z.object({
          id: z.string(),
          name: z.string(),
          track_url: z.string(),
          artists: z.array(z.object({ id: z.string(), name: z.string() })),
          images: z.array(
            z.object({ url: z.string(), height: z.number(), width: z.number() })
          ),
          album_name: z.string(),
          album_type: z.string(),
          album_group: z.string(),
          release_date: z.string(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const fanAnthem = await ctx.prisma.fan.update({
        where: { uuid: input.uuid },
        data: {
          ...input,
        },
      });

      return fanAnthem;
    }),

  signature: publicProcedure
    .input(
      z.object({
        uuid: z.string(),
        signature: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const fanSignature = await ctx.prisma.fan.update({
        where: { uuid: input.uuid },
        data: {
          ...input,
        },
      });

      return fanSignature;
    }),

  email: publicProcedure
    .input(
      z.object({
        uuid: z.string(),
        email: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const exists = await ctx.prisma.fan.findUnique({
        where: { uuid: input.uuid },
        include: { anthem: true },
      });

      if (!exists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "This fan does not exist",
        });
      }

      const result = await EmailService.sendElement(
        WelcomeEmail({
          fanName: exists.fullname,
          anthem: exists.anthem?.name,
          licenseId: exists.uuid,
        }),
        {
          to: input.email,
          subject: WelcomeEmailSubject(),
        }
      );

      if (!result) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send email",
        });
      }

      return {
        message: "Email sent successfully!",
      };
    }),

  // exportLicense: publicProcedure
  //   .input(
  //     z.object({
  //       fanData: z.any(),
  //       selectedBg: z.string(),
  //     })
  //   )
  //   .mutation(async ({ input }) => {
  //     const buffer = await ExportService.generateLicense(
  //       input.fanData,
  //       input.selectedBg
  //     );
  //     return buffer;
  //   }),
});
