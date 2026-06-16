import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const token = process.env.TOKEN || process.argv[2]

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(2)
}

if (!token) {
  console.error('Usage: TOKEN=<token> SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/check_survey.mjs <token>')
  process.exit(2)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function run() {
  try {
    console.log('Checking recipient for token:', token)
    const { data: recipient, error: rErr } = await supabase
      .from('com_recipients')
      .select('*')
      .eq('token', token)
      .single()

    if (rErr && rErr.code !== 'PGRST116') { // single() returns 404-like error code when not found
      console.error('Error querying com_recipients:', rErr.message || rErr)
      process.exit(3)
    }

    if (!recipient) {
      console.error('Recipient not found for token')
      process.exit(4)
    }

    console.log('Recipient:', {
      id: recipient.id,
      athlete_id: recipient.athlete_id,
      communication_id: recipient.communication_id,
      status: recipient.status,
      opened_at: recipient.opened_at,
      responded_at: recipient.responded_at
    })

    console.log('\nChecking communication id:', recipient.communication_id)
    const { data: communication, error: cErr } = await supabase
      .from('com_communications')
      .select('*')
      .eq('id', recipient.communication_id)
      .single()

    if (cErr) {
      console.error('Error querying com_communications:', cErr.message || cErr)
      process.exit(5)
    }

    console.log('Communication:', { id: communication.id, title: communication.title, type: communication.type })

    console.log('\nChecking survey for communication')
    const { data: survey, error: sErr } = await supabase
      .from('com_surveys')
      .select('*')
      .eq('communication_id', recipient.communication_id)
      .single()

    if (sErr) {
      console.error('Survey not found for this communication (com_surveys).')
      console.error('You may need to create a survey row or re-run the create API.')
      process.exit(6)
    }

    console.log('Survey:', { id: survey.id })

    console.log('\nFetching questions and options...')
    const { data: questions, error: qErr } = await supabase
      .from('com_survey_questions')
      .select('*, com_survey_options(*)')
      .eq('survey_id', survey.id)
      .order('id', { ascending: true })

    if (qErr) {
      console.error('Error fetching questions:', qErr.message || qErr)
      process.exit(7)
    }

    if (!questions || questions.length === 0) {
      console.warn('No questions found for survey.');
    } else {
      console.log('Questions found:', questions.length)
      for (const q of questions) {
        console.log('\nQuestion', q.id, q.question_text || '(no text)', 'type=', q.type, 'client_id=', q.client_id)
        const opts = q.com_survey_options || []
        if (opts.length === 0) console.log('  (no options)')
        else {
          for (const o of opts) {
            console.log('  Option', o.id, 'ordre=', o.ordre, 'text=', o.option_text, 'client_id=', o.client_id)
          }
        }
      }
    }

    console.log('\nOK — diagnostic complete')
    process.exit(0)
  } catch (e) {
    console.error('Unexpected error:', e?.message || e)
    process.exit(99)
  }
}

run()
