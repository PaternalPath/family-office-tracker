import { z } from 'zod'

/**
 * Transaction schema - the normalized shape for all imported transactions
 */
export const TransactionSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  description: z.string().min(1),
  amount: z.number().finite(),
  source: z.string().min(1)
})

/**
 * Row-level import error
 */
export const ImportErrorSchema = z.object({
  row: z.number().int().positive(),
  field: z.string().optional(),
  message: z.string(),
  value: z.unknown().optional()
})

/**
 * Category rule condition (when clause)
 */
export const RuleConditionSchema = z
  .object({
    contains: z.array(z.string()).optional(),
    any_contains: z.array(z.string()).optional(),
    all_contains: z.array(z.string()).optional(),
    regex: z
      .union([
        z.string(),
        z.object({
          pattern: z.string(),
          flags: z.string().optional()
        })
      ])
      .optional(),
    amount_gt: z.number().optional(),
    amount_lt: z.number().optional(),
    amount_between: z
      .object({
        min: z.number(),
        max: z.number()
      })
      .optional()
  })
  .refine(
    (data) => {
      // At least one condition must be specified
      return Object.keys(data).some((key) => data[key] !== undefined)
    },
    { message: 'At least one condition must be specified in "when" clause' }
  )

/**
 * Split allocation for distributing a transaction across ventures
 */
export const SplitAllocationSchema = z.object({
  venture: z.string().min(1),
  percent: z.number().positive().max(100),
  note: z.string().optional()
})

/**
 * Category rule action (then clause)
 */
export const RuleActionSchema = z.object({
  category: z.string().optional(),
  venture: z.string().optional(),
  requiresReceipt: z.boolean().optional(),
  note: z.string().optional(),
  split: z.array(SplitAllocationSchema).optional()
})

/**
 * Full category rule
 */
export const CategoryRuleSchema = z.object({
  id: z.string().min(1),
  priority: z.number().int().optional(),
  when: RuleConditionSchema,
  then: RuleActionSchema
})

/**
 * Rules file structure
 */
export const RulesFileSchema = z.object({
  ventures: z.array(z.string()).optional(),
  rules: z.array(CategoryRuleSchema)
})

/**
 * Categorized transaction (after rule matching)
 */
export const CategorizedTransactionSchema = TransactionSchema.extend({
  category: z.string(),
  venture: z.string(),
  requiresReceipt: z.boolean(),
  note: z.string().optional(),
  audit: z.array(z.record(z.unknown())),
  // Optional split fields
  originalTxnId: z.string().optional(),
  allocation: z
    .object({
      percent: z.number(),
      originalAmount: z.number(),
      splitIndex: z.number(),
      totalSplits: z.number()
    })
    .optional()
})

/**
 * Monthly summary entry
 */
export const MonthlySummarySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM format'),
  totalAmount: z.number(),
  transactionCount: z.number().int().nonnegative(),
  byCategory: z.record(z.number())
})

/**
 * Import result containing both valid transactions and errors
 */
export const ImportResultSchema = z.object({
  transactions: z.array(TransactionSchema),
  errors: z.array(ImportErrorSchema),
  totalRows: z.number().int().nonnegative(),
  validCount: z.number().int().nonnegative(),
  errorCount: z.number().int().nonnegative()
})

// Type exports for JSDoc usage
/** @typedef {z.infer<typeof TransactionSchema>} Transaction */
/** @typedef {z.infer<typeof ImportErrorSchema>} ImportError */
/** @typedef {z.infer<typeof CategoryRuleSchema>} CategoryRule */
/** @typedef {z.infer<typeof RulesFileSchema>} RulesFile */
/** @typedef {z.infer<typeof CategorizedTransactionSchema>} CategorizedTransaction */
/** @typedef {z.infer<typeof MonthlySummarySchema>} MonthlySummary */
/** @typedef {z.infer<typeof ImportResultSchema>} ImportResult */

/**
 * Validate a transaction object
 * @param {unknown} data
 * @returns {{ success: true, data: Transaction } | { success: false, error: z.ZodError }}
 */
export function validateTransaction(data) {
  return TransactionSchema.safeParse(data)
}

/**
 * Validate a rules file
 * @param {unknown} data
 * @returns {{ success: true, data: RulesFile } | { success: false, error: z.ZodError }}
 */
export function validateRulesFile(data) {
  return RulesFileSchema.safeParse(data)
}

/**
 * Format Zod errors into user-friendly messages
 * @param {z.ZodError} error
 * @returns {string[]}
 */
export function formatZodErrors(error) {
  return error.errors.map((e) => {
    const path = e.path.length > 0 ? `${e.path.join('.')}: ` : ''
    return `${path}${e.message}`
  })
}
