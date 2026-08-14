import { ErrorMessage } from '@hookform/error-message'
import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router'
import { Activity, useRef } from 'react'
import { type Resolver, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription } from '@/components/ui/field'
import { Form, FormField } from '@/components/ui/form'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { ROUTES } from '@/enum/routes'
import type { IOTPFormType } from '@/interface/auth'
import { getTranslations } from '@/lib/translation'
import { useValidateOTPMutation } from '@/queries/use-auth-query'
import { otpSchemas } from '@/schemas/auth-schemas'
export const Route = createFileRoute('/_guest/otp')({ component: OTPSignup })
// Define the state type — add this to the route file
declare module '@tanstack/react-router' {
  interface HistoryState {
    email?: string
  }
}
function OTPSignup() {
  const translations = getTranslations()
  const navigate = useNavigate()
  const email = useRouterState({ select: (state) => state.location.state.email })
  const form = useForm<IOTPFormType>({
    mode: 'onChange',
    resolver: zodResolver(otpSchemas() as never) as Resolver<IOTPFormType>,
  })
  const {
    control,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = form
  const otpSlotsNumber = useRef<number>(6)
  const { mutateAsync: validateOTPMutation, isPending: isValidateOTPPending } =
    useValidateOTPMutation({
      onSuccess: () => {
        navigate({ to: ROUTES.HOME as string })
        toast.success(translations.otp_verified_success())
      },
      onError: () => {
        setError('otp', { message: translations.validation_otp_incorrect() })
      },
    })

  const onSubmit = async (data: IOTPFormType) => {
    if (!email) {
      toast.error(translations.validation_email_required())
      return
    }
    if (isValidateOTPPending) {
      toast.error(translations.validation_otp_required())
      return
    }
    await validateOTPMutation({
      email: email ?? '',
      otp: data.otp,
    })
  }
  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <p className="text-center font-medium text-sm">
          {translations.sent_code_text()} <span className="block underline">{email}</span>
        </p>
        <FormField
          name="otp"
          control={control}
          render={({ field }) => (
            <InputOTP
              autoFocus
              maxLength={6}
              disabled={isValidateOTPPending}
              className="flex flex-col"
              onComplete={() =>
                onSubmit({
                  otp: watch('otp'),
                })
              }
              {...field}
              onChange={field.onChange}
            >
              <InputOTPGroup className="mx-auto gap-2 [&>div]:size-8 [&>div]:rounded-xl [&>div]:border-l sm:[&>div]:size-14">
                {Array.from({ length: otpSlotsNumber.current }).map((_, index) => (
                  <InputOTPSlot
                    key={`otp-slot-${
                      // biome-ignore lint/suspicious/noArrayIndexKey: otp is always fixed slot
                      index
                    }`}
                    index={index}
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          )}
        />

        <Activity mode={errors ? 'visible' : 'hidden'}>
          <div className="flex w-full justify-center">
            <ErrorMessage
              errors={errors}
              name="otp"
              render={({ message }) => {
                return (
                  <p className="w-full text-center text-red-400 text-xs font-medium">{message}</p>
                )
              }}
            />
          </div>
        </Activity>
        <FieldDescription className="text-center font-light text-[#000000DE]">
          {translations.didnt_get_code_text()}{' '}
          <Button variant="link" className="text-primary hover:cursor-pointer p-0">
            {translations.click_to_resend()}
          </Button>
        </FieldDescription>
        <Field>
          <Button
            disabled={isValidateOTPPending}
            loading={isValidateOTPPending}
            type="submit"
            className="h-12 gap-2 rounded-b-sm font-normal"
          >
            {translations.otp_button()}
          </Button>
        </Field>
      </form>
    </Form>
  )
}

export default OTPSignup
