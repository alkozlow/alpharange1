import { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AddressValidatorProps {
  address: string;
  onValidationChange: (isValid: boolean, network?: string) => void;
}

export const AddressValidator = ({ address, onValidationChange }: AddressValidatorProps) => {
  const [validationState, setValidationState] = useState<{
    isValid: boolean;
    isChecking: boolean;
    network?: string;
    error?: string;
  }>({ isValid: false, isChecking: false });

  const validationIdRef = useRef(0);

  useEffect(() => {
    const trimmed = address.trim();

    // Increment validation id to cancel previous validations
    validationIdRef.current += 1;
    const thisId = validationIdRef.current;

    if (!trimmed) {
      setValidationState({ isValid: false, isChecking: false });
      onValidationChange(false);
      return;
    }

    // Start checking state immediately and reset parent validity
    setValidationState({ isValid: false, isChecking: true });
    onValidationChange(false);

    // Basic format validation
    const isValidFormat = /^0x[a-fA-F0-9]{40}$/.test(trimmed);
    if (!isValidFormat) {
      setValidationState({
        isValid: false,
        isChecking: false,
        error: 'Invalid address format'
      });
      onValidationChange(false);
      return;
    }

    // Debounced mock network detection (replace with real check in future)
    const timeout = setTimeout(() => {
      // Ignore if a new validation started
      if (validationIdRef.current !== thisId) return;

      const networks = ['Ethereum', 'Polygon', 'Arbitrum'];
      const network = networks[Math.floor(Math.random() * networks.length)];

      setValidationState({
        isValid: true,
        isChecking: false,
        network
      });
      onValidationChange(true, network);
    }, 300);

    return () => clearTimeout(timeout);
  }, [address, onValidationChange]);

  if (!address.trim()) return null;

  return (
    <div className="flex items-center gap-2 mt-2">
      {validationState.isChecking ? (
        <Badge variant="secondary" className="text-xs">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Validating...
        </Badge>
      ) : validationState.isValid ? (
        <Badge variant="secondary" className="bg-success/10 text-success border-success/20 text-xs">
          <CheckCircle className="w-3 h-3 mr-1" />
          Valid {validationState.network} address
        </Badge>
      ) : validationState.error ? (
        <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
          <XCircle className="w-3 h-3 mr-1" />
          {validationState.error}
        </Badge>
      ) : null}
    </div>
  );
};