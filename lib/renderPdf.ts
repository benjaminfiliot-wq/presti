import { renderToStream } from '@react-pdf/renderer'
import type { ReactElement } from 'react'

// Rend un élément @react-pdf en Buffer via renderToStream (fiable en serverless,
// contrairement à renderToBuffer qui n'est pas exposé sur l'export CJS).
export async function renderPdfToBuffer(element: ReactElement): Promise<Buffer> {
  const stream = await renderToStream(element as unknown as Parameters<typeof renderToStream>[0])
  const chunks: Buffer[] = []
  for await (const chunk of stream as unknown as AsyncIterable<Buffer | string>) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}
