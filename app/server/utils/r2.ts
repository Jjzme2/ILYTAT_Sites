import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'

let _client: S3Client | null = null

function useR2Client(): S3Client {
  if (_client) return _client
  const config = useRuntimeConfig()
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.r2AccessKeyId as string,
      secretAccessKey: config.r2SecretAccessKey as string,
    },
  })
  return _client
}

export async function listR2Docs(): Promise<Array<{ key: string; name: string; lastModified?: string }>> {
  const config = useRuntimeConfig()
  const client = useR2Client()
  const res = await client.send(new ListObjectsV2Command({
    Bucket: config.r2BucketName as string,
    Prefix: 'docs/',
  }))
  return (res.Contents || [])
    .filter(obj => obj.Key && obj.Key !== 'docs/')
    .map(obj => ({
      key: obj.Key!,
      name: obj.Key!
        .replace(/^docs\//, '')
        .replace(/\.html$/, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase()),
      lastModified: obj.LastModified?.toISOString(),
    }))
}

export async function getR2Doc(key: string): Promise<string> {
  const config = useRuntimeConfig()
  if (!key.startsWith('docs/') || key.includes('..')) {
    throw createError({ statusCode: 400, message: 'Invalid document key' })
  }
  const client = useR2Client()
  const res = await client.send(new GetObjectCommand({
    Bucket: config.r2BucketName as string,
    Key: key,
  }))
  if (!res.Body) throw createError({ statusCode: 404, message: 'Document not found' })
  return await res.Body.transformToString()
}
