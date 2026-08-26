/**
 * The error contract: { message, code, details }.
 *
 * Two properties matter more than the rest and are asserted first.
 *
 *   `message` stays at the TOP LEVEL. 36 places in the frontend read
 *   `err.response?.data?.message`, with `?.`, so wrapping it would make all 36 render
 *   `undefined` without a single one of them throwing.
 *
 *   `code` and `details` are ADDITIONS. Nothing that reads the old shape changes, which
 *   is what makes the whole error contract non-breaking.
 */

import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";

import { app } from "./helpers/factories.js";
import errorHandler from "../src/errors/errorHandler.js";
import { AppError, notFound, forbidden, validationFailed } from "../src/errors/AppError.js";
import asyncHandler from "../src/http/asyncHandler.js";

/** A throwaway app, so a handler can be made to fail on purpose. */
const appThatThrows = (handler) => {
    const test = express();

    test.use(express.json({ limit: "1kb" }));
    test.get("/boom", asyncHandler(handler));
    test.post("/boom", asyncHandler(handler));
    test.use(errorHandler);

    return test;
};

describe("AppError through errorHandler", () => {
    it("answers with the status, code and message it was given", async () => {
        const server = appThatThrows(async () => {
            throw notFound("Project not found");
        });

        const res = await request(server).get("/boom");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ message: "Project not found", code: "NOT_FOUND", details: null });
    });

    it("keeps message at the top level, never wrapped", async () => {
        const server = appThatThrows(async () => {
            throw forbidden("Not yours.");
        });

        const res = await request(server).get("/boom");

        // The exact expression the frontend uses in 36 places.
        expect(res.body?.message).toBe("Not yours.");
        expect(res.body.error).toBeUndefined();
    });

    it("carries details only for a validation failure, naming the field", async () => {
        const server = appThatThrows(async () => {
            throw validationFailed("Some fields need attention.", [
                { field: "title", message: "A title is required." },
            ]);
        });

        const res = await request(server).get("/boom");

        expect(res.status).toBe(422);
        expect(res.body.code).toBe("VALIDATION_FAILED");
        expect(res.body.details).toEqual([{ field: "title", message: "A title is required." }]);
    });
});

describe("an error that is not an AppError", () => {
    // Never the real message: an unexpected error carries table names, column names and
    // sometimes values. The stack goes to the log instead.
    it("becomes a 500 INTERNAL with a generic sentence, leaking nothing", async () => {
        const server = appThatThrows(async () => {
            throw new Error('relation "secret_table" does not exist');
        });

        const res = await request(server).get("/boom");

        expect(res.status).toBe(500);
        expect(res.body.code).toBe("INTERNAL");
        expect(res.body.message).toBe("Something went wrong on our side.");
        expect(JSON.stringify(res.body)).not.toContain("secret_table");
    });
});

describe("errors from express.json(), which no controller has ever seen", () => {
    // Before this handler existed these came back as Express's default HTML page. That
    // is what made the 413 of 2026-08-11 so hard to find: the body parser rejects the
    // request before the router runs, so nothing appeared in the service logs at all.
    it("413 PAYLOAD_TOO_LARGE as JSON, not an HTML page", async () => {
        const server = appThatThrows(async (req, res) => res.json({ ok: true }));

        const res = await request(server)
            .post("/boom")
            .set("Content-Type", "application/json")
            .send(JSON.stringify({ padding: "x".repeat(4000) }));

        expect(res.status).toBe(413);
        expect(res.body.code).toBe("PAYLOAD_TOO_LARGE");
        expect(res.headers["content-type"]).toContain("application/json");
    });

    it("400 MALFORMED_REQUEST for a body that is not valid JSON", async () => {
        const server = appThatThrows(async (req, res) => res.json({ ok: true }));

        const res = await request(server)
            .post("/boom")
            .set("Content-Type", "application/json")
            .send("{ this is not json");

        expect(res.status).toBe(400);
        expect(res.body.code).toBe("MALFORMED_REQUEST");
    });
});

describe("asyncHandler", () => {
    // Express 5 already forwards a rejected promise, so this proves the wrapper adds
    // nothing surprising rather than that it is load-bearing today.
    it("forwards a rejected promise to the error handler", async () => {
        const server = appThatThrows(async () => {
            throw new AppError(409, "CONFLICT", "Already archived.");
        });

        const res = await request(server).get("/boom");

        expect(res.status).toBe(409);
        expect(res.body.code).toBe("CONFLICT");
    });

    it("passes a synchronous throw through too", async () => {
        const test = express();

        test.get("/sync", asyncHandler(() => {
            throw notFound("Nope");
        }));
        test.use(errorHandler);

        const res = await request(test).get("/sync");

        expect(res.status).toBe(404);
    });
});

describe("the real app now returns JSON for a body it cannot read", () => {
    it("400 MALFORMED_REQUEST on POST /api/auth/login with broken JSON", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .set("Content-Type", "application/json")
            .send("{ nope");

        expect(res.status).toBe(400);
        expect(res.body.code).toBe("MALFORMED_REQUEST");
        expect(res.body.message).toBe("The request body is not valid JSON.");
    });
});
