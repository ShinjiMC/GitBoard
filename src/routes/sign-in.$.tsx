import { SignIn } from "@clerk/remix";
export default function SignedUpRoute(){
    return(
        <div>
            <SignIn />
        </div>
    )
}