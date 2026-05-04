/**
 * GET /api/fortune
 *
 * Returns a professional-yet-fun fortune that is:
 *   — Deterministic per IP address per calendar day (same IP = same fortune all day)
 *   — Different the next day (date is part of the seed)
 *
 * No auth required. No database reads — just a hash + array lookup.
 * The hash is a standard DJB2-style integer fold, kept intentionally simple
 * because crypto-quality randomness is irrelevant here.
 */

const FORTUNES = [
  'Your next customer is searching for you right now.',
  'A website that tells your story is worth ten that don\'t.',
  'Fortune favors those who show up — online and in person.',
  'The gap between where you are and where you want to be is called a plan.',
  'Small towns have big hearts. Give yours a web address.',
  'Your best day of business is still ahead of you.',
  'A handshake builds trust. A great website earns the first one.',
  'The quietest businesses often have the loudest reputations.',
  'Someone today will choose you. Make sure they can find you.',
  'Every expert was once a beginner with a good idea and a lot of follow-through.',
  'Your competitors are only as strong as your silence lets them be.',
  'One well-placed contact form can change the course of a business.',
  'The best time to build your website was yesterday. Today still counts.',
  'Your story deserves to be told beautifully.',
  'Speed and clarity: the two things every customer wants.',
  'Great work speaks for itself — but only if people can hear it.',
  'The local business that shows up online, shows up everywhere.',
  'Invest in your online presence the way you invest in your business.',
  'Somewhere, your ideal customer is waiting for exactly what you offer.',
  'The most powerful marketing you have is the truth about what you do.',
  'Good first impressions are made in seconds. Own every one of them.',
  'A slow website costs more than a fast one ever will.',
  'Your credibility is your currency. Spend it wisely.',
  'Every successful business started with someone saying "why not me?"',
  'The right website doesn\'t just look good — it earns its keep.',
  'Clarity converts. Confusion costs.',
  'Your brand is the promise you make. Your website is where you keep it.',
  'Today is a good day to be found by someone who needs you.',
  'The path to growth runs through visibility.',
  'Authenticity is the unfair advantage that never expires.',
  'Your community is waiting to support you. Let them find you.',
  'The best investment in your business is the one you can measure.',
  'Simple, fast, and honest: the formula that never gets old.',
  'A great website works while you sleep.',
  'Your reputation is built one interaction at a time. Make them count.',
  'The businesses that endure are the ones that evolve.',
  'Do what you do so well that people can\'t help but tell others.',
  'Your website is your hardest-working employee.',
  'Consistency builds what brilliance alone cannot: trust.',
  'The internet has room for every good business. Claim yours.',
  'Today\'s quiet effort is tomorrow\'s easy win.',
  'Show your work. The right people will notice.',
  'The best time to be local and visible online is right now.',
  'You don\'t need to be everywhere — just where your customers are.',
  'Quality work always finds its audience.',
  'Fortune favors those who own their digital presence.',
  'A single great online review can outlast a thousand ads.',
  'Behind every successful local business is someone who kept showing up.',
  'The future is already here — it just has a better contact form.',
  'Being found is the beginning of being chosen.',
  'Your next chapter starts with someone clicking contact.',
  'The right words on the right page can open the right doors.',
  'Good businesses are built slowly. Great ones are found quickly.',
  'Not all treasure is gold — but a fast, honest website comes close.',
  'Your best marketing is a customer who couldn\'t imagine going elsewhere.',
  'Presence isn\'t everything — but it\'s where everything begins.',
  'The most underrated business strategy: being easy to find.',
  'You are exactly what someone is looking for today.',
  'Every great business has a story. Make yours easy to read.',
  'The distance between obscurity and success is often just a URL.',
]

function dailyIndex(ip: string, count: number): number {
  const seed = `${ip.trim()}:${new Date().toISOString().slice(0, 10)}`
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  }
  return Math.abs(h) % count
}

export default defineEventHandler((event) => {
  const ip
    = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]
    ?? getRequestHeader(event, 'x-real-ip')
    ?? event.node.req.socket?.remoteAddress
    ?? '0.0.0.0'

  return {
    fortune: FORTUNES[dailyIndex(ip, FORTUNES.length)],
    date: new Date().toISOString().slice(0, 10),
  }
})
