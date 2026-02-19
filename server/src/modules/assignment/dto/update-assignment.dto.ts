import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';
import { AssignmentStatus } from '../entities/assignment.entity';

export class UpdateAssignmentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  deadline?: string;

  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;

  @IsOptional()
  @IsBoolean()
  aiEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  visibleAfterSubmit?: boolean;

  @IsOptional()
  @IsBoolean()
  allowViewAnswer?: boolean;

  @IsOptional()
  @IsBoolean()
  allowViewScore?: boolean;

  @IsOptional()
  @IsBoolean()
  handwritingRecognition?: boolean;

  @IsOptional()
  @IsNumber()
  totalScore?: number;
}
