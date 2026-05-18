import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type UploadInput = {
  key: string;
  bytes: Uint8Array;
  contentType?: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`MISSING_${name}`);
  return value;
}

function buildPublicUrl(key: string): string {
  const publicBase = getRequiredEnv("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");
  return `${publicBase}/${key.replace(/^\/+/, "")}`;
}

function createR2Client(): S3Client {
  const accountId = getRequiredEnv("R2_ACCOUNT_ID");
  const accessKeyId = getRequiredEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = getRequiredEnv("R2_SECRET_ACCESS_KEY");

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function uploadBytesToR2(input: UploadInput): Promise<string> {
  const bucket = getRequiredEnv("R2_BUCKET");
  const client = createR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Body: input.bytes,
      ContentType: input.contentType || "image/png",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return buildPublicUrl(input.key);
}
