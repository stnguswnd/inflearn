
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
// Note: Avoid direct Prisma types here to prevent build issues across versions
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    createCourseDto: CreateCourseDto,
  ) {
    const { categoryIds: inputCategoryIds, ...otherData } = createCourseDto;
    const categoryIds = inputCategoryIds ?? [];

    const data: any = {
      slug: otherData.slug,
      title: otherData.title,
      shortDescription: otherData.shortDescription,
      description: otherData.description,
      thumbnailUrl: otherData.thumbnailUrl,
      price: otherData.price,
      discountPrice: otherData.discountPrice,
      level: otherData.level,
      instructorId: userId,
      categories: {
        connect: categoryIds.map((id) => ({ id })),
      },
    };

    if (typeof otherData.isPublished === 'boolean') {
      data.status = otherData.isPublished ? 'PUBLISHED' : 'DRAFT';
    }

    return this.prisma.course.create({ data });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: any;
    where?: any;
    orderBy?: any;
  }) {
    const { skip, take, cursor, where, orderBy } = params;

    return this.prisma.course.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async findOne(id: string, include?: string[]) {
    const aliasToPrismaKey: Record<string, string> = {
      section: 'sections',
      sections: 'sections',
      lecture: 'lectures',
      lectures: 'lectures',
      coursereview: 'reviews',
      coursereviews: 'reviews',
      reviews: 'reviews',
      category: 'categories',
      categories: 'categories',
      enrollment: 'enrollments',
      enrollments: 'enrollments',
      instructor: 'instructor',
      question: 'questions',
      questions: 'questions',
    };

    const includeObject: Record<string, boolean> | undefined = include && include.length > 0
      ? include.reduce<Record<string, boolean>>((acc, rawKey) => {
          const key = String(rawKey).toLowerCase();
          const prismaKey = aliasToPrismaKey[key];
          if (prismaKey) {
            acc[prismaKey] = true;
          }
          return acc;
        }, {})
      : undefined;

    const course = await this.prisma.course.findUnique({
      where: { id },
      include: includeObject,
    });

    return course;
  }

  async update(
    id: string,
    userId: string,
    updateCourseDto: UpdateCourseDto,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException(`ID: ${id} 코스를 찾을 수 없습니다.`);
    }

    if (course.instructorId !== userId) {
      throw new UnauthorizedException('강의의 소유자만 수정할 수 있습니다.');
    }

    const {
      categoryIds: inputCategoryIds,
      isPublished,
      slug,
      title,
      shortDescription,
      description,
      thumbnailUrl,
      price,
      discountPrice,
      level,
    } = updateCourseDto;

    const data: any = {
      ...(slug !== undefined && { slug }),
      ...(title !== undefined && { title }),
      ...(shortDescription !== undefined && { shortDescription }),
      ...(description !== undefined && { description }),
      ...(thumbnailUrl !== undefined && { thumbnailUrl }),
      ...(price !== undefined && { price }),
      ...(discountPrice !== undefined && { discountPrice }),
      ...(level !== undefined && { level }),
    };

    if (typeof isPublished === 'boolean') {
      data.status = isPublished ? 'PUBLISHED' : 'DRAFT';
    }

    if (Array.isArray(inputCategoryIds)) {
      data.categories = {
        set: inputCategoryIds.map((id) => ({ id })),
      };
    }

    return this.prisma.course.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, userId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException(`ID: ${id} 코스를 찾을 수 없습니다.`);
    }

    if (course.instructorId !== userId) {
      throw new UnauthorizedException('강의의 소유자만 삭제할 수 있습니다.');
    }

    return this.prisma.course.delete({
      where: { id },
    });
  }
}