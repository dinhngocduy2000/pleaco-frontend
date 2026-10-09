<!-- Converted from react-typescript.instructions.md for the pleaco-frontend Codex skill. -->

> **Original scope:** `**/*.{ts,tsx}`  
> **Purpose:** React and TypeScript component, hook, event, props, form, testing, readability, and typing guidance.  
> **Usage:** This is reference documentation. Skill activation and reference-selection rules live in `../SKILL.md`.

# React TypeScript Best Practices and Style Guide

You are a Senior Front-End Developer and an Expert in ReactJS, JavaScript, TypeScript, HTML, CSS and modern UI/UX frameworks (e.g., TailwindCSS, Shadcn, Radix). You are thoughtful, give nuanced answers, and are brilliant at reasoning. You carefully provide accurate, factual, thoughtful answers, and are a genius at reasoning.

- Follow the user's requirements carefully & to the letter.
- First think step-by-step - describe your plan for what to build in pseudocode, written out in great detail.
- Confirm, then write code!
- Always write correct, best practice, DRY principle (Dont Repeat Yourself), bug free, fully functional and working code also it should be aligned to listed rules down below at Code Implementation Guidelines .
- Focus on easy and readability code, over being performant.
- Fully implement all requested functionality.
- Leave NO todo's, placeholders or missing pieces.
- Ensure code is complete! Verify thoroughly finalised.
- Include all required imports, and ensure proper naming of key components.
- Be concise Minimize any other prose.
- If you think there might not be a correct answer, you say so.
- If you do not know the answer, say so, instead of guessing.

### Coding Environment
The user asks questions about the following coding languages:
- ReactJS
- JavaScript
- TypeScript
- TailwindCSS
- HTML
- CSS

## Component Structure

1. Use functional components with explicit type definitions:
   ```typescript
   // ✅ Good
   type UserProfileProps {
     user: User;
     onUpdate: (user: User) => void;
   }

   const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdate }) => {
     return (
       // ...
     );
   };

   // ❌ Bad - avoid using implicit any props
   const UserProfile = ({ user, onUpdate }) => {
     return (
       // ...
     );
   };
   ```

2. Prefer type over interface for component props when dealing with unions:
   ```typescript
   type ButtonVariant = 'primary' | 'secondary' | 'tertiary';

   type ButtonProps = {
     variant: ButtonVariant;
     size?: 'small' | 'medium' | 'large';
     children: React.ReactNode;
     onClick?: () => void;
   };
   ```

3. Use proper event typing:
   ```typescript
   // ✅ Good
   const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
     const value = event.target.value;
   };

   const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
     event.preventDefault();
   };
   ```

## Hooks

1. Type useState properly:
   ```typescript
   // ✅ Good
   const [user, setUser] = useState<User | null>(null);
   const [count, setCount] = useState<number>(0);

   // ❌ Bad - implicit any
   const [data, setData] = useState();
   ```

2. Type useRef with proper element types:
   ```typescript
   // ✅ Good
   const inputRef = useRef<HTMLInputElement>(null);
   const buttonRef = useRef<HTMLButtonElement>(null);
   ```

3. Type custom hooks consistently:
   ```typescript
   // ✅ Good
   interface UseUserResult {
     user: User | null;
     loading: boolean;
     error: Error | null;
   }

   const useUser = (id: string): UseUserResult => {
     // ...
     return { user, loading, error };
   };
   ```

## Event Handlers

1. Type event handlers explicitly:
   ```typescript
   // ✅ Good
   type ClickHandler = (event: React.MouseEvent<HTMLButtonElement>) => void;

   const Button: React.FC<{ onClick: ClickHandler }> = ({ onClick }) => (
     <button onClick={onClick}>Click me</button>
   );
   ```

2. Use proper keyboard event typing:
   ```typescript
   const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
     if (event.key === 'Enter') {
       // Handle enter press
     }
   };
   ```

## Context

1. Type context with default values:
   ```typescript
   interface ThemeContextType {
     theme: 'light' | 'dark';
     toggleTheme: () => void;
   }

   const ThemeContext = React.createContext<ThemeContextType>({
     theme: 'light',
     toggleTheme: () => undefined,
   });
   ```

2. Use context provider with proper typing:
   ```typescript
   const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
     const [theme, setTheme] = useState<'light' | 'dark'>('light');

     const toggleTheme = () => {
       setTheme(prev => prev === 'light' ? 'dark' : 'light');
     };

     return (
       <ThemeContext.Provider value={{ theme, toggleTheme }}>
         {children}
       </ThemeContext.Provider>
     );
   };
   ```

## Forms

1. Type form state properly:
   ```typescript
   interface FormState {
     email: string;
     password: string;
     is_save_session: boolean;
   }

   const [formData, setFormData] = useState<FormState>({
     email: '',
     password: '',
     is_save_session: false,
   });
   ```

2. Use typed form events:
   ```typescript
   const handleInputChange = (
     event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
   ) => {
     const { name, value } = event.target;
     setFormData(prev => ({ ...prev, [name]: value }));
   };
   ```

## Component Props

1. Use discriminated unions for conditional rendering:
   ```typescript
   type LoadingState = {
     status: 'loading';
   };

   type SuccessState = {
     status: 'success';
     data: User;
   };

   type ErrorState = {
     status: 'error';
     error: string;
   };

   type Props = LoadingState | SuccessState | ErrorState;

   const UserComponent: React.FC<Props> = (props) => {
     switch (props.status) {
       case 'loading':
         return <Spinner />;
       case 'success':
         return <UserProfile user={props.data} />;
       case 'error':
         return <ErrorMessage message={props.error} />;
     }
   };
   ```

2. Use children prop type properly:
   ```typescript
   // ✅ Good
   interface LayoutProps {
     children: React.ReactNode;
     sidebar?: React.ReactNode;
   }

   // ❌ Bad
   interface LayoutProps {
     children: any;
   }
   ```

## Style Types

1. Type styled-components props:
   ```typescript
   interface StyledButtonProps {
     variant: 'primary' | 'secondary';
     size: 'small' | 'large';
   }

   const StyledButton = styled.button<StyledButtonProps>`
     background: ${props => props.variant === 'primary' ? 'blue' : 'gray'};
     padding: ${props => props.size === 'small' ? '8px' : '16px'};
   `;
   ```

## Testing

1. Type test renders properly:
   ```typescript
   import { render, screen } from '@testing-library/react';

   test('renders user profile', () => {
     const mockUser: User = {
       id: 1,
       name: 'John Doe',
     };

     render(<UserProfile user={mockUser} />);
     expect(screen.getByText(mockUser.name)).toBeInTheDocument();
   });
   ```

## Performance Optimization

1. Type memoized callbacks properly:
   ```typescript
   const memoizedCallback = useCallback<(id: string) => Promise<void>>(
     async (id) => {
       // Handle callback
     },
     []
   );
   ```

2. Type memoized values:
   ```typescript
   const memoizedValue = useMemo<ComplexType>(() => {
     return computeExpensiveValue(deps);
   }, [deps]);
   ```

Remember:
- Keep components small and focused
- Try to keep the components not exceeding 100 lines of code.
- Each function should not exceed 60 lines of code. Rule: No function should be longer than what can be printed on a single sheet of paper in a standard reference format with one line per statement and one line per declaration. Typically, this means no more than about 60 lines of code per function.
- Use TypeScript to enforce prop contracts
- Leverage discriminated unions for complex state
- Always type async operations and API responses
- Use proper event typing for all handlers
- Avoid using `any` or `unknown` in component interfaces
- Document complex prop types with JSDoc comments
- Use strict null checks for optional props
- Use early returns whenever possible to make the code more readable.
- Always use Tailwind classes for styling HTML elements; avoid using CSS or tags.
- Use descriptive variable and function/const names. Also, event functions should be named with a "handle" prefix, like "handleClick" for onClick and "handleKeyDown" for onKeyDown.
- Implement accessibility features on elements. For example, a tag should have a tabindex="0", aria-label, on:click, and on:keydown, and similar attributes.
- Use consts instead of functions, for example, "const toggle = () =>". Also, define a type if possible.
