import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lydghzyitzfdtlddkfmq.supabase.co'
const supabaseKey = 'sb_publishable_q5xT5DTuCvfeYpfL6FmZjw_aulGQ23u'

export const supabase = createClient(supabaseUrl, supabaseKey)