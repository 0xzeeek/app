import { Resource } from "sst";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return new Response(JSON.stringify({ success: false, message: "No file present" }), { status: 400 });
    }

    const command = new PutObjectCommand({
      Key: crypto.randomUUID(),
      Bucket: Resource.AgentImage.name,
    });
    const url = await getSignedUrl(new S3Client({}), command);

    const imageResult = await fetch(url, {
      body: file,
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        "Content-Disposition": `attachment; filename="${file.name}"`,
      },
    });

    console.log("Image upload result:", imageResult.url.split("?")[0]);

    if (imageResult.status !== 200) {
      throw new Error("Failed to upload image");
    }

    return new Response(JSON.stringify({ success: true, data: imageResult.url.split("?")[0] }), { status: 200 });
  } catch (error) {
    console.error(new Error(`Error uploading image: ${error}`));
    return new Response(JSON.stringify({ success: false, message: "Failed to upload image" }), { status: 500 });
  }
}
