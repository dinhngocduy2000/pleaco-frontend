import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import type { AxiosError } from 'axios'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { type Resolver, useForm } from 'react-hook-form'
import { GoogleIcon } from '@/assets/svgs/google-icon'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { TypographyMuted, TypographyP } from '@/components/ui/typography'
import { ROUTES } from '@/enum/routes'
import { type IRegisterFormType, SsoProviders } from '@/interface/auth'
import { getTranslations } from '@/lib/translation'
import { useGetGoogleLoginURL, useRegisterMutation } from '@/queries/use-auth-query'
import { createRegisterFormSchemas } from '@/schemas/auth-schemas'

export const Route = createFileRoute('/_guest/register')({ component: RegisterPage })

function RegisterPage() {
  const translation = getTranslations()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { mutateAsync: getGoogleLoginURL, isPending: isGettingGoogleLoginURL } =
    useGetGoogleLoginURL({
      onSuccess: (data) => {
        console.log(data)
      },
    })
  const form = useForm<IRegisterFormType>({
    mode: 'onChange',
    resolver: zodResolver(createRegisterFormSchemas() as never) as Resolver<IRegisterFormType>,
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })
  const {
    formState: { isValid },
  } = form

  const { mutateAsync, isPending, error } = useRegisterMutation({
    onSuccess: (_, request) => {
      navigate({
        to: ROUTES.OTP as string,
        state: {
          email: request?.email ?? '',
        },
      })
    },
  })

  const onSubmit = async (data: IRegisterFormType) => {
    await mutateAsync({ name: data.name, email: data.email, password: data.password })
  }

  const serverError = error as AxiosError<{ detail: string }> | null
  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="name">{translation.register_name_label()}</FormLabel>
                <FormControl>
                  <Input
                    data-testid="name-input"
                    type="text"
                    placeholder={translation.register_name_placeholder()}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="email">{translation.register_email_label()}</FormLabel>
                <FormControl>
                  <Input
                    data-testid="email-input"
                    type="email"
                    placeholder={translation.register_email_placeholder()}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="password">
                  {translation.register_password_label()}
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      data-testid="password-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={translation.register_password_placeholder()}
                      className="pr-10"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((prev) => !prev)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="confirm-password">
                  {translation.register_confirm_password_label()}
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      data-testid="confirm-password-input"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder={translation.register_confirm_password_placeholder()}
                      className="pr-10"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {serverError && (
            <TypographyP className="mt-0! text-sm text-destructive">
              {serverError?.response?.data?.detail || translation.register_failed()}
            </TypographyP>
          )}

          <Button
            type="submit"
            data-testid="register-button"
            className="w-full"
            loading={isPending}
            disabled={isPending || !isValid}
          >
            {translation.register_submit()}
          </Button>
        </form>
      </Form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <TypographyMuted className="bg-card px-2">
            {translation.register_or_continue_with()}
          </TypographyMuted>
        </div>
      </div>

      <Button
        loading={isGettingGoogleLoginURL}
        onClick={() => getGoogleLoginURL({ provider: SsoProviders.google })}
        disabled={isGettingGoogleLoginURL}
        variant="outline"
        className="w-full"
        type="button"
      >
        <GoogleIcon className="size-4" />
        {translation.register_google()}
      </Button>

      <div className="mt-4 text-center text-sm">
        <TypographyMuted>
          {translation.register_have_account()}{' '}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            {translation.register_login_link()}
          </Link>
        </TypographyMuted>
      </div>
    </>
  )
}
